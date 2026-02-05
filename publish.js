var fs = require('fs');
var path = require('path');
var mqtt = require('mqtt');

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

var MQTT_URL = process.env.MQTT_URL
var MQTT_OPTIONS = {
    clientId: process.env.MQTT_PUBLISHER_CLIENT_ID || process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true
};

var topic = process.argv[2]
var message = process.argv[3]

var client = mqtt.connect(MQTT_URL, MQTT_OPTIONS)
client.on('connect', function () {
    console.log("Connected to broker")
    client.publish(topic, message)
    client.end()
})
