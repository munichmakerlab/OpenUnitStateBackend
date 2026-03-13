var fs = require('fs');
var path = require('path');
var mqtt = require('mqtt');
var mysql = require('mysql');

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }
    var contents = fs.readFileSync(filePath, 'utf8');
    contents.split(/\r?\n/).forEach(function (line) {
        var trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }
        var idx = trimmed.indexOf('=');
        if (idx === -1) {
            return;
        }
        var key = trimmed.slice(0, idx).trim();
        var value = trimmed.slice(idx + 1).trim();
        if (!key) {
            return;
        }
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

loadEnvFile(path.join(__dirname, '.env'));

var db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

var MQTT_URL = process.env.MQTT_URL
var MQTT_OPTIONS = {
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true
};

var ROOT_TOPIC = process.env.ROOT_TOPIC

// Connect clients
db.connect(function (err) {
    if (err) {
        console.error("Error connection to MySQL db: " + err.stack);
        return;
    }

    console.log("Connected to MySQL db");
});

var mqtt_client = mqtt.connect(MQTT_URL, MQTT_OPTIONS)
mqtt_client.on("connect", function () {
    console.log("Connected to MQTT broker at " + MQTT_URL + " as " + MQTT_OPTIONS["clientId"])
    mqtt_client.subscribe(ROOT_TOPIC + "/#", function (err) {
        console.log("Subscribed to " + ROOT_TOPIC + "/#")
    })

})


//
mqtt_client.on("message", function (topic, message) {
    console.log("Message received on '" + topic + "':", message.toString())

    var parsedMsg = parseMessage(topic, message)
    console.log("Parsed message:", parsedMsg)

    switch (parsedMsg.func) {
        case "push_to_unlock":
            onPushToUnlock(parsedMsg.payload)
            break;
        case "card_read":
            onCardRead(parsedMsg.chipId, parsedMsg.payload)
            break;
        case "connected":
            onConnected(parsedMsg.chipId, parsedMsg.payload)
    }
})

function parseMessage(topic, message) {

    var meta = topic.replace(ROOT_TOPIC + "/", "").split("/")

    var orgId = '-1' // meta[0]
    var chipId = meta[0]
    var func = meta[1]
    var payload = message.toString()

    return {
        orgId: orgId,
        chipId: chipId,
        func: func,
        payload: payload
    }
}

function onPushToUnlock(chipId) {
    console.log("Push-request to unlock", chipId);
    unlockUnit(chipId);
}

async function onCardRead(chipId, cardId) {
    console.log("Card", cardId, "requested to unlock", chipId);

    var userId = await getCardOwner(cardId);
    console.log("card read userid", userId)
    if (userId == null) {
        showMessage(chipId, "CARD#: " + cardId);
        return;
    }
    var authorized = await checkPermissions(userId, chipId)
    if (authorized) {
        unlockUnit(chipId);
    } else {
        console.log("Card", cardId, "belonging to", userId, "not authorized for", chipId);
        showMessage(chipId, "CARD#: " + cardId);
    }
}

function onConnected(chipId, payload) {
    console.log("Chip", chipId, "connected, pushing config")

    setTimeout(pushUnitConfig, 3000, chipId);
    
}

async function pushUnitConfig(chipId) {

    var status = await getUnitStatus(chipId)
    var name = await getUnitName(chipId)
    var unitOrg = await getUnitOrg(chipId);
    if (unitOrg != null) {
        console.log("Setting name on", chipId, "mqtt message:", ROOT_TOPIC + "/" + chipId + "/config_name", name)
        mqtt_client.publish(ROOT_TOPIC + "/" + chipId + "/config_name", name)
        console.log("Setting status on", chipId, "mqtt message:", ROOT_TOPIC + "/" + chipId + "/config_status", status)
        mqtt_client.publish(ROOT_TOPIC + "/" + chipId + "/config_status", status.toString())
    } else {
        console.log(chipId, "unitOrg is null")
    }
}

async function getUnitName(chipId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT unitName FROM units WHERE chipId = ?', [chipId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].unitName);
            } else {
                console.log("getUnitName: chipId", chipId, "not found")
                resolve("");
            }
        });
    });
}

async function getUnitStatus(chipId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT status FROM units WHERE chipId = ?', [chipId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].status);
            } else {
                console.log("getUnitStatus: chipId", chipId, "not found")
                resolve(null)
            }
        });
    });
}

async function getUnitOrg(chipId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT orgId FROM units WHERE chipId = ?', [chipId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].orgId);
            } else {
                console.log("getUnitOrg: chipId", chipId, "not found");
                resolve(null);
            }
        });
    });
}

async function getUnitUnlockTime(chipId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT defaultUnlockTime FROM units WHERE chipId = ?', [chipId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].defaultUnlockTime);
            } else {
                console.log("getUnitUnlockTime: chipId", chipId, "not found");
                resolve(null);
            }
        });
    });
}

async function getOrgMembership(userId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT orgId, typeId FROM orgMembers WHERE userId = ?', [userId], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                resolve(results);
            } else {
                console.log("getOrgMembership: userId", userId, "not found");
                resolve(null);
            }
        });
    });
}

async function getCardOwner(cardId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT userId FROM cards WHERE cardId = ?', [cardId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].userId);
            } else {
                console.log("getCardOwner: cardId", cardId, "not found");
                resolve(null);
            }
        });
    });
}

async function getUnitId(chipId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT unitId FROM units WHERE chipId = ?', [chipId], function (error, results, fields) {
            if (error) throw error;
            if (results.length == 1) {
                resolve(results[0].unitId);
            } else {
                console.log("getUnitId: chipId", chipId, "not found");
                resolve(null);
            }
        });
    });
}

async function getUnitGroups(unitId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT groupId FROM unitGroups WHERE unitId = ?', [unitId], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                resolve(results);
            } else {
                console.log("getUnitGroup: unitId", unitId, "not found");
                resolve(null);
            }
        });
    });
}

async function getGroupPermission(userId, groupId) {
    return new Promise(function (resolve, reject) {
        db.query('SELECT permType, validFrom, validUntil FROM userPermissions WHERE userId = ? AND groupId = ?', [userId, groupId], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                resolve(results);
            } else {
                console.log("getGroupPermission: userId", userId, " and groupId", groupId, "not found");
                resolve(null);
            }
        });
    });
}

async function checkPermissions(userId, chipId) {
    return new Promise(async function (resolve, reject) {
        var memberships = await getOrgMembership(userId);
        var unitOrg = await getUnitOrg(chipId);
        var status = await getUnitStatus(chipId);

        if (unitOrg != null) {
            for (let mem of memberships) {
                if (mem.orgId == unitOrg) {
                    if (mem.typeId == -1) {
                        resolve(false);
                    } else if (mem.typeId > 0) {
                        resolve(true);
                    } else {
                        var unitId = await getUnitId(chipId)
                        var groups = await getUnitGroups(unitId)
                        for (let g of groups) {
                            var permissions = await getGroupPermission(userId, g.groupId)
                            for (let perm of permissions) {
                                console.log(perm)
                                if (perm.permType == 1 && status == 5) {
                                    resolve(true);
                                } else if (perm.permType == 2) {
                                    resolve(true);
                                }
                            }
                        }
                        resolve(false);
                    }
                }
            }
        } else {
            console.log("checkPermissions: Couldn't find org associated with chipId", chipId);
        }

        resolve(false);
    });
}

async function unlockUnit(chipId, unlockTime = 0) {
    return new Promise(async function (resolve, reject) {
        var unitOrg = await getUnitOrg(chipId);
        if (unitOrg != null) {
            if (unlockTime == 0) {
                unlockTime = await getUnitUnlockTime(chipId)
            }
            if (unlockTime == null) {
                console.log("Unlock time error")
                return;
            }
            unlockTime = unlockTime * 1000;
            console.log("Unlocking", chipId, "mqtt message:", ROOT_TOPIC + "/" + chipId + "/unlocked_time", unlockTime)
            mqtt_client.publish(ROOT_TOPIC + "/" + chipId + "/unlocked_time", unlockTime.toString())
        } else {
            console.log("unlockUnit: Couldn't find org associated with chipId", chipId);
        }
    });
}

async function showMessage(chipId, message) {
    return new Promise(async function (resolve, reject) {
        var unitOrg = await getUnitOrg(chipId);
        console.log(unitOrg)
        if (unitOrg != null) {
            console.log("Showing message", ROOT_TOPIC + "/" + chipId + "/quick_display_msg", message)
            mqtt_client.publish(ROOT_TOPIC + "/" + chipId + "/quick_display_msg", message)
        }
    });
}

setInterval(function () {
    db.ping(function (err) {
        if (err) throw err;
        console.log("Pinging MySQL server keepalive...");
    })
}, 300000);
