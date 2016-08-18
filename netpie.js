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
    var _ = require("underscore");
    

    var initMicrogear = function (config, node) {
        node.microgear = MicroGear.create({
            key: config.appKey,
            secret: config.appSecret
        });
        node.microgear.setCachePath(node.id + ".cache");
        node.microgear.on('connected', function () {
            console.log(node.id + ' is connected...');
            // node.microgear.setName(config.gearName);
            // node.microgear.setAlias(node.category+"-"+config.gearName);
            var topic = "/gearname/"+ config.gearName;
            node.microgear.subscribe(topic, function () {
                console.log('subscribed to ', topic);
            });
            node.status({fill: "green", shape: "dot", text: "common.status.connected"});
        });

        node.microgear.on('message', function (topic, body) {
            console.log('incoming : ' + topic + ' : ' + body.toString());
            var obj = {
                payload: (body.toString()),
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
        var node = this;

        try {
            initMicrogear(config, node);
            node.status({fill: "yellow", shape: "dot", text: "common.status.connecting"});
            node.microgear.connect(config.appId);
        }
        catch (ex) {
            console.log('exception====', ex);
            throw ex;
        }

        this.on("input", function (msg) {
            console.log("console.log", "HELLO");
        });

        this.on("close", function (done) {
            console.log('NETPIE-IN Closed');
            this.status({fill: "red", shape: "ring", text: "disconnected"});
            node.microgear.disconnect(function () { /* never has been called */ });

            setTimeout(function () {
                done();
            }, 5);
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
            // console.log("INPUT==", msg);
            var payload = msg.payload;
            var payload_type = Object.prototype.toString.call(payload);
            var vstr = "";

            if (payload_type == "[object String]") {
                console.log(config.targetGearName, ">> is string...");
                node.microgear.chat(config.targetGearName, ""+payload, {retain: false}, function () {
                    console.log("published !", arguments);
                });
            }
            else if (payload_type == "[object Object]") {
                var ks = _.map((_.keys(payload)), function(v) { return parseInt(v, 10); });;
                console.log(config.targetGearName, ">> is object...");
                if (_.every(ks, _.isFinite)) {
                    vstr = _.values(payload).join('');
                    node.microgear.chat(config.targetGearName, vstr, {retain: false}, function () {
                        console.log("published !", arguments);
                    });
                }
                else {
                    console.log(config.targetGearName, ">> is pure object...");
                    // console.log("need .message", msg);
                    if (payload.message) {
                        node.microgear.chat(config.targetGearName, payload.message, {retain: false}, function () {
                            console.log("published !", arguments);
                        });
                    }
                    else {
                        console.log(payload);
                        node.warn("no payload.message");
                    }
                }
            }
        });

        this.on("close", function (done) {
            console.log('NETPIE-IN Closed');
            this.status({fill: "red", shape: "ring", text: "disconnected"});
            node.microgear.disconnect(function () { /* never has been called */ });
            setTimeout(function () {
                done();
            }, 200);
        });
    }

    RED.nodes.registerType("netpie-in", NETPIEInNode);
    RED.nodes.registerType("netpie-out", NETPIEOutNode);
};
