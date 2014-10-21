go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;


    // Application flow overview
    // -------------------------

    // state_start
    // This will be a switching state, using the following logic:
    //   - Registered user:
    //     - 'STOP' > state_opt_out? (opt user out - send message confirming opt-out?)
    //     - 'any other'
    //       - Finished receiving msgs > state_finished_msgs (sms to inform they've received all messages)
    //       - Unfinished msg stream > state_unfinished_msgs (sms to inform they'll receive scheduled msg and how to opt out)
    //   - Unregistered user:
    //     - 'MMC' > state_language (send language choice message, register them)
    //     - 'any other' > state_how_to_register (send sms telling them how to register)

    // state_language
    // Choice state
    // 1. Xhosa
    // 2. Zulu
    // 3. Sotho
    // 4. Afrikaans
    // 5. English

    // state_opt_out
    // "~~ You have opted out"

    // state_finished_msgs
    // "~~ You received all messages"

    // state_unfinished_msgs
    // "~~ You'll receive messages, or sms stop"

    // state_how_to_register
    // "~~ SMS MMC to ### to register"


    var GoApp = App.extend(function(self) {
        App.call(self, 'states:start');

        self.states.add('states:start', function(name) {
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
    });

    return {
        GoApp: GoApp
    };
}();
