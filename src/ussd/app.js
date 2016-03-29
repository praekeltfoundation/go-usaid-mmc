go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var LanguageChoice = vumigo.states.LanguageChoice;
    var EndState = vumigo.states.EndState;

    var GoApp = App.extend(function(self) {
        App.call(self, 'states:start');

        self.init = function() {
            // Fetch the contact from the contact store that matches the current
            // user's address. When we get the contact, we put the contact on the
            // app so we can reference it easily when creating each state.
            return self.im
                .contacts.for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                });
        };

        self.states.add('states:start', function(name) {
            if(!self.im.user.lang){
                return self.states.create('states:select_language');
            }else{
                return self.states.create('states:main_menu');
            }
        });

        self.states.add('states:main_menu', function(name){
            return new ChoiceState(name, {
                question: 'Medical Male Circumcision:',

                choices: [
                    new Choice('states:end', 'Find a clinic'),
                    new Choice('states:end', 'Speak to an expert for FREE'),
                    new Choice('states:healthsites', 'Get FREE SMSs about your MMC recovery'),
                    new Choice('states:end', 'Rate your clinic’s MMC service'),
                    new Choice('states:main_menu_pg2', 'N'),
                    new Choice('states:end', 'E')],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:main_menu_pg2', function(name){
            return new ChoiceState(name, {
                question: 'Medical Male Circumcision (MMC):',

                choices: [
                    new Choice('states:start', 'Join Brothers for Life'),
                    new Choice('states:select_language', 'Change Language'),
                    new Choice('states:main_menu', 'Back'),
                    new Choice('states:end', 'Exit')],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:end', function(name) {
            return new EndState(name, {
                text: 'Thanks, cheers!',
                next: 'states:start'
            });
        });

        self.states.add('states:select_language', function(name){
            return new LanguageChoice(name, {
                next: function(choice) {
                    self.contact.extra.language_choice = choice.value;
                    return self.im.contacts.save(self.contact)
                        .then(function () {
                            return "states:main_menu";
                        });
                },
                question: "Welcome to MMC Service. Choose your language:",
                choices: [
                    new Choice("en", "English"),
                    new Choice("zu", "isiZulu"),
                    new Choice("st", "Sesotho"),
                    new Choice("ss", "Siswati"),
                    new Choice("nd", "isiNdebele"),
                    new Choice("tn", "Setswana"),
                    new Choice("xh", "isiXhosa"),
                    new Choice("ts", "Xitsonga")
                ]
            });
        });

        self.states.add('states:healthsites', function(name){
            return new ChoiceState(name, {
                question: "Welcome to Healthsites. What type of clinic are you looking for?",
                choices: [
                    new Choice("states:end", "Nearest Clinic"),
                    new Choice("states:end", "MMC Clinic"),
                    new Choice("states:end", "HCT Clinic")
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });


    });

    return {
        GoApp: GoApp
    };
}();
