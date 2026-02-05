SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cards
-- ----------------------------
DROP TABLE IF EXISTS `cards`;
CREATE TABLE `cards`  (
  `cardId` varchar(8) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `userId` int(8) NOT NULL,
  `cardActive` int(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`cardId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for groups
-- ----------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups`  (
  `groupId` int(8) NOT NULL AUTO_INCREMENT,
  `groupName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `orgId` int(8) NOT NULL,
  PRIMARY KEY (`groupId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for orgMembers
-- ----------------------------
DROP TABLE IF EXISTS `orgMembers`;
CREATE TABLE `orgMembers`  (
  `userId` int(8) NOT NULL,
  `orgId` int(8) NOT NULL,
  `typeId` int(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`, `orgId`, `typeId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for orgs
-- ----------------------------
DROP TABLE IF EXISTS `orgs`;
CREATE TABLE `orgs`  (
  `orgId` int(8) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  PRIMARY KEY (`orgId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for unitGroups
-- ----------------------------
DROP TABLE IF EXISTS `unitGroups`;
CREATE TABLE `unitGroups`  (
  `groupId` int(8) NOT NULL,
  `unitId` int(8) NOT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for units
-- ----------------------------
DROP TABLE IF EXISTS `units`;
CREATE TABLE `units`  (
  `unitId` int(8) NOT NULL AUTO_INCREMENT,
  `orgId` int(8) NOT NULL,
  `chipId` varchar(8) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `unitName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `status` int(8) NOT NULL DEFAULT 0,
  `defaultUnlockTime` int(8) NOT NULL,
  PRIMARY KEY (`unitId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for userPermissions
-- ----------------------------
DROP TABLE IF EXISTS `userPermissions`;
CREATE TABLE `userPermissions`  (
  `userId` int(8) NOT NULL,
  `groupId` int(8) NOT NULL,
  `permType` int(4) NOT NULL DEFAULT 1,
  `validFrom` datetime NOT NULL DEFAULT '2020-01-01 00:00:00',
  `validUntil` datetime NOT NULL DEFAULT '2100-01-01 00:00:00',
  `permissionAdded` datetime NULL DEFAULT current_timestamp()
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `userId` int(8) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `notes` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT '',
  PRIMARY KEY (`userId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 158 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
