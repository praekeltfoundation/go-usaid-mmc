go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;


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
                if (self.contact.extra.finished_messages === 'true') {  // make this happen
                    return self.states.create('states_finished_messages');
                } else {
                    return self.states.create('states_unfinished_messages');
                }
            }
        });

        self.states.add('states_register_english', function(name) {
            // subscribe user to english message set
            return self.states.create('states_language');
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
                    return self.im.user
                        .set_lang(choice.value)
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
            return self.states.create('states_start');
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
            return self.states.create('states_unsubscribe');
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
