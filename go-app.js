// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var HttpApi = vumigo.http.api.HttpApi;


    go.utils = {

        opt_out: function(im, contact) {
            return im.api_request('optout.optout', {
                address_type: "msisdn",
                address_value: contact.msisdn,
                message_id: im.msg.message_id
            });
        },

        control_api_call: function (method, payload, endpoint, im) {
            var http = new HttpApi(im, {
              headers: {
                'Content-Type': ['application/json'],
                'Authorization': ['ApiKey ' + im.config.control.username + ':' + im.config.control.api_key]
              }
            });
            switch (method) {
              case "post":
                return http.post(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                  });
              case "get":
                return http.get(im.config.control.url + endpoint, {
                    params: payload
                  });
              case "put":
                return http.put(im.config.control.url + endpoint, {
                    data: JSON.stringify(payload)
                  });
              case "delete":
                return http.delete(im.config.control.url + endpoint);
            }
        },

        subscription_completed: function(contact, im) {
            var payload = {
                to_addr: contact.msisdn
            };
            return go.utils
                .control_api_call("get", payload, 'subscription/', im)
                .then(function(json_result) {
                    var parsed_data = JSON.parse(json_result.data);
                    var all_completed = true;
                    for (i=0; i<parsed_data.objects.length; i++) {
                        if (parsed_data.objects[i].completed === false) {
                            all_completed = false;
                        }
                    }
                    return all_completed;
                });
        },

        subscription_unsubscribe_all: function(contact, im) {
            var payload = {
                to_addr: contact.msisdn
            };
            return go.utils
                .control_api_call("get", payload, 'subscription/', im)
                .then(function(json_result) {
                    // make all subscriptions inactive
                    var update = JSON.parse(json_result.data);
                    var clean = true;
                    for (i=0;i<update.objects.length;i++) {
                        if (update.objects[i].active === true){
                            update.objects[i].active = false;
                            clean = false;
                        }
                    }
                    if (!clean) {
                        return go.utils.control_api_call("put", update, 'subscription/', im);
                    } else {
                        return Q();
                    }

                });
        },

        subscription_set_language: function(contact, im, lang) {
            var payload = {
                to_addr: contact.msisdn
            };
            return go.utils
                .control_api_call("get", payload, 'subscription/', im)
                .then(function(json_result) {
                    // make all subscriptions inactive
                    var update = JSON.parse(json_result.data);
                    var clean = true;
                    for (i=0;i<update.objects.length;i++) {
                        if (update.objects[i].lang !== lang){
                            update.objects[i].lang = lang;
                            clean = false;
                        }
                    }
                    if (!clean) {
                        return go.utils.control_api_call("put", update, 'subscription/', im);
                    } else {
                        return Q();
                    }

                });
        },


        subscription_subscribe: function(contact, im) {
            var payload = {
              contact_key: contact.key,
              lang: 'en',
              message_set: "/subscription/api/v1/message_set/12/",
              next_sequence_number: 1,
              schedule: "/subscription/api/v1/periodic_task/1/",
              to_addr: contact.msisdn,
              user_account: contact.user_account
            };
            return go.utils.control_api_call("post", payload, 'subscription/', im);
        },

        "commas": "commas"

    };


    var GoApp = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;

        self.init = function() {
            // self.env = self.im.config.env;
            // self.metric_prefix = [self.env, self.im.config.name].join('.');
            // self.store_name = [self.env, self.im.config.name].join('.');

            // self.im.on('session:new', function(e) {
            //     self.contact.extra.ussd_sessions = go.utils.incr_user_extra(
            //         self.contact.extra.ussd_sessions, 1);
            //     self.contact.extra.metric_sum_sessions = go.utils.incr_user_extra(self.contact.extra.metric_sum_sessions, 1);

            //     return Q.all([
            //         self.im.contacts.save(self.contact),
            //         self.im.metrics.fire.inc([self.env, 'sum.sessions'].join('.'), 1),
            //         self.fire_incomplete(e.im.state.name, -1)
            //     ]);
            // });

            // self.im.on('session:close', function(e) {
            //     return Q.all([
            //         self.fire_incomplete(e.im.state.name, 1),
            //         self.dial_back(e)
            //     ]);
            // });

            // self.im.user.on('user:new', function(e) {
            //     return Q.all([
            //         go.utils.fire_users_metrics(self.im, self.store_name, self.env, self.metric_prefix),
            //         // TODO re-evaluate the use of this metric
            //         // self.fire_incomplete('states_start', 1)
            //     ]);
            // });

            // self.im.on('state:enter', function(e) {
            //     self.contact.extra.last_stage = e.state.name;
            //     return self.im.contacts.save(self.contact);
            // });

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


        self.states.add('states_start', function(name) {
            var first_word = self.im.msg.content.split(" ")[0].replace(/\W/g, '').toUpperCase();

            // always unsubscribe on stop or block
            if (first_word === "STOP" || first_word === "BLOCK") {
                return self.states.create('states_opt_out');

            // user isn't registered
            } else if (_.isUndefined(self.contact.extra.is_registered) ||
                            self.contact.extra.is_registered === 'false') {
                if (first_word === "MMC") {
                    return self.states.create('states_register_english');
                } else {
                    return self.states.create('states_how_to_register');
                }

            // user is registered
            } else if (self.contact.extra.is_registered === 'true') {
                return go.utils
                    .subscription_completed(self.contact, self.im)
                    .then(function(messages_completed) {
                        if (messages_completed === true) {
                            return self.states.create('states_finished_messages');
                        } else {
                            return self.states.create('states_unfinished_messages');
                        }
                    });
            }
        });

        self.states.add('states_register_english', function(name) {
            return go.utils
                .subscription_subscribe(self.contact, self.im)
                .then(function() {
                    return self.states.create('states_language');
                });
        });

        self.states.add('states_language', function(name) {
            return new ChoiceState(name, {
                question:
                    $("You're registered for messages about your circumcision! Reply with " +
                    "the number of your chosen language:"),

                choices: [
                    new Choice('xh', $("Xhosa")),
                    new Choice('zu', $("Zulu")),
                    new Choice('st', $("Sotho")),
                    new Choice('en', $("English")),
                    new Choice('af', $("Afrikaans")),
                ],

                next: function(choice) {
                    self.contact.extra.language_choice = choice.value;

                    return self.im.user
                        .set_lang(choice.value)
                        .then(function() {
                            return self.im.contacts.save(self.contact);
                        })
                        .then(function() {
                            return 'states_update_language';
                        });
                },

                events: {
                    'state:enter': function() {
                        self.contact.extra.is_registered = 'true';

                        return self.im.user
                            .set_lang('en')
                            .then(function() {
                                return self.im.contacts.save(self.contact);
                            });
                    }
                }
            });
        });

        self.states.add('states_update_language', function(name) {
            // update subscription to language of choice
            return go.utils
                .subscription_set_language(self.contact, self.im, self.contact.extra.language_choice)
                .then(function() {
                     return self.states.create('states_update_language_success');
                });
        });


        self.states.add('states_update_language_success', function(name) {
            return new EndState(name, {
                text:
                    $("You will receive messages in your chosen language from tomorrow. " +
                      "Thanks for using the MMC info service."),

                next: 'states_start'
            });
        });

        self.states.add('states_how_to_register', function(name) {
            return new EndState(name, {
                text:
                    $("Welcome to the Medical Male Circumcision (MMC) info service. To get " +
                    "FREE info on how to look after your circumcision wound please SMS 'MMC' " +
                    "to {{SMS_number}}."
                    ).context({
                        SMS_number: self.im.config.channel
                    }),

                next: 'states_start'
            });
        });

        self.states.add('states_finished_messages', function(name) {
            return new EndState(name, {
                text:
                    $("You have finished your set of SMSs and your circumcision wound should " +
                    "be healed. If not, please visit your local clinic. Thanks for using " +
                    "the MMC info service."),

                next: 'states_start'
            });
        });

        self.states.add('states_unfinished_messages', function(name) {
            return new EndState(name, {
                text:
                    $("MMC info: U r registered to receive SMSs about ur circumcision. " +
                    "To opt out SMS 'STOP' to {{SMS_number}}. If u have concerns with ur " +
                    "wound please visit ur local clinic."
                    ).context({
                        SMS_number: self.im.config.channel
                    }),

                next: 'states_start'
            });
        });

        self.states.add('states_opt_out', function(name) {
            // run opt-out calls
            return go.utils
                .opt_out(self.im, self.contact)
                .then(function() {
                    return go.utils
                        .subscription_unsubscribe_all(self.contact, self.im)
                        .then(function() {
                            return self.states.create('states_unsubscribe');
                        });
                });
        });

        self.states.add('states_unsubscribe', function(name) {
            return new EndState(name, {
                text:
                    $("You have been unsubscribed."),

                next: 'states_start'
            });
        });

    });

    return {
        GoApp: GoApp
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;


    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
