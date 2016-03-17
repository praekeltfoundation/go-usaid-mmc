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
                question: 'Hi there! What do you want to do?',

                choices: [
                    new Choice('states:start', 'Show this menu again'),
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
    });

    return {
        GoApp: GoApp
    };
}();
