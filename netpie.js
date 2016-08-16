/**
 * Copyright 2013, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
    var MicroGear = require("microgear");
    var util = require("util");

    var initMicrogear = function (config, node) {
        node.microgear = MicroGear.create({
            key: config.appKey,
            secret: config.appSecret
        });

        node.microgear.setCachePath(node.id + ".cache");
        node.microgear.on('connected', function () {
            console.log(node.id + ' is connected...');
            node.microgear.setName(config.gearName);
            node.microgear.setAlias(node.category+"-"+config.gearName);
            // node.microgear.subscribe("/gearname/#", function () { });
            node.status({fill: "green", shape: "dot", text: "common.status.connected"});
        });

        node.microgear.on('message', function (topic, body) {
            console.log('incoming : ' + topic + ' : ' + body);
            var obj = {
                payload: new String(body),
                raw_payload: body,
                topic: topic
            };
            node.send(obj);
        });

        node.microgear.on('closed', function () {
            this.status({fill: "red", shape: "ring", text: "disconnected"});
            console.log('Closed...');
        });
    };

    function NETPIEInNode(config) {
        RED.nodes.createNode(this, config);
        console.log("netpie out node created");
        this.appKey = config.appId;
        this.appSecret = config.appSecret;
        this.appId = config.appId;
        this.gearName = config.gearName;
        var node = this;

        initMicrogear(config, node);

        try {
            node.status({fill: "yellow", shape: "dot", text: "common.status.connecting"});
            node.microgear.connect(config.appId);
        }
        catch (ex) {
            console.log(ex);
        }

        this.on("input", function (msg) {
            console.log("console.log", "HELLO");
        });

        this.on("close", function (done) {
            console.log('NETPIE-IN Closed');
            this.status({fill: "red", shape: "ring", text: "disconnected"});
            node.microgear.disconnect(function () { /* never has been called */
            });
            setTimeout(function () {
                done();
            }, 200);
        });
    }

    function NETPIEOutNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        console.log("netpie out node created");
        node.status({fill: "green", shape: "dot", text: "common.status.connected"});

        initMicrogear(config, node);
        try {
            node.status({fill: "yellow", shape: "dot", text: "common.status.connecting"});
            node.microgear.connect(config.appId);
        }
        catch (ex) {
            node.error(ex);
        }

        this.on("input", function (msg) {
            node.microgear.chat(config.targetGearName, ""+ (msg.payload), {retain: false}, function () {
                console.log("published !", arguments);
            });
        });

        this.on("close", function () {
            console.log('NETPIE-IN Closed');
            this.status({fill: "red", shape: "ring", text: "disconnected"});
            node.microgear.disconnect(function () { /* never has been called */ });
        });
    }

    RED.nodes.registerType("netpie-in", NETPIEInNode);
    RED.nodes.registerType("netpie-out", NETPIEOutNode);

};
