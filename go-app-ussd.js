// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var FreeText = vumigo.states.FreeText;
    var LanguageChoice = vumigo.states.LanguageChoice;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
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
            return new PaginatedChoiceState(name, {
                question: 'Medical Male Circumcision (MMC):',
                characters_per_page: 160,
                options_per_page: null,
                choices: [
                    new Choice('states:end', 'Find a clinic'),
                    new Choice('states:end', 'Speak to an expert for FREE'),
                    new Choice('states:healthsites', 'Get FREE SMSs about your MMC recovery'),
                    new Choice('states:service_rating_1', 'Rate your clinic\'s MMC service'),
                    new Choice('states:end', 'Join Brothers for Life'),
                    new Choice('states:select_language', 'Change Language'),
                    new Choice('states:end', 'Exit'),
                ],
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

        self.states.add('states:service_rating_1', function(name){
            return new FreeText(name, {
                question: "At which clinic did you get circumcised? Please be specific with the name and " +
                "location. e.g. Peterville Clinic, Rivonia, Johannesburg",
                next: function(text) {
                    return 'states:service_rating_2';
                }
            });
        });

        self.states.add('states:service_rating_2', function(name){
            return new ChoiceState(name, {
                question: "Would you recommend a friend to the clinic where you got circumcised?",
                choices: [
                    new Choice("states:service_rating_3", "Yes"),
                    new Choice("states:service_rating_3", "No"),
                    new Choice("states:service_rating_end2", "I have not been circumcised")
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:service_rating_3', function(name){
            return new ChoiceState(name, {
                question: "How would you rate the attitude of the health care workers at the clinic " +
                "where you got circumcised?",
                choices: [
                    new Choice("states:service_rating_4", "Very Bad"),
                    new Choice("states:service_rating_4", "Bad"),
                    new Choice("states:service_rating_4", "OK"),
                    new Choice("states:service_rating_4", "Good"),
                    new Choice("states:service_rating_4", "Excellent")
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:service_rating_4', function(name){
            return new ChoiceState(name, {
                question: "Did you subscribe to the post op SMS service?",
                choices: [
                    new Choice("states:service_rating_end1", "Yes I found it helpful"),
                    new Choice("states:service_rating_end1", "Yes but it was not helpful"),
                    new Choice("states:service_rating_end1", "No I chose not to subscribe"),
                    new Choice("states:service_rating_end1", "I didn't know about it")
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:service_rating_end1', function(name){
            return new ChoiceState(name, {
                question: "Thanks for rating your circumcision experience. We appreciate your feedback, it will " +
                "help us improve our MMC service.",
                choices: [
                    new Choice("states:main_menu", "Main Menu"),
                    new Choice("states:end", "Exit")
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:service_rating_end2', function(name){
            return new ChoiceState(name, {
                question: "Thank you for your interest. We are only looking for ratings from men who have " +
                "had their circumcision at a clinic recently.",
                choices: [
                    new Choice("states:main_menu", "Main Menu"),
                    new Choice("states:end", "Exit")
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

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;


    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
