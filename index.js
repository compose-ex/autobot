var Botkit = require('botkit');
var config = require('config');
var massive = require('massive');
var _ = require('lodash');

var connString = config.get('compose.postgres');
var db = massive.connectSync({connectionString: connString});

if(!process.env.token) {
  console.log("Must set slack token in env.");
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: false
});

controller.spawn({
  token: process.env.token
}).startRTM(function(err) {
  if(err) {
    throw new Error(err);
  }
});

controller.hears(['hello','hi'], ['direct_mention','mention'], function(bot, msg) {
  bot.reply(msg, "yello");
});

controller.hears(['add my car', 'add', 'new'], ['direct_message', 'direct_mention'], function(bot, msg) {
  askMake = function(res, convo) {
    convo.on('end', function(convo) {
      var res = _.values(convo.extractResponses());
      convo.say("Going to add a ", res[1], " ", res[0], " with ", res[2], " miles");
      console.log('heelooo');
    });

    convo.ask('What make is your vehicle? [e.g. Toyota, Ford...]', function(res, convo) {
      var res = _.values(convo.extractResponses());
      db.make(res[0], function(err, make_name) {
        if(err) { console.log(err);}
        if(!make_name.length) {
          convo.say('Oooh, I don\'t recognize that make!');
          convo.repeat();
          convo.next();
        } else {
          convo.say('Got it!');
          askYear(res, convo);
          convo.next();
        }
      });
    });
  }
  askYear = function(res, convo) {
    convo.ask('What year is your vehicle?', function(res, convo) {
      convo.say('Alright!');
      askMileage(res, convo);
      convo.next();
    });
  }
  askMileage = function(res, convo) {
    convo.ask('How many miles (roughly) are on your vehicle now?', function(res, convo) {
      convo.say('Not Bad.');
      validate(res, convo);
      convo.next();
    });
  }
  validate = function(res, convo) {
    var res = _.values(convo.extractResponses());
    var question = "Want me to add a " + res[1] + " " + res[0] +
                   " with " + res[2] + " miles?"
    convo.ask(question, [ 
      {
        pattern: bot.utterances.yes,
        callback: function(res, convo) {
          convo.say("Adding it!");
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(res, convo) {
          convo.say("Ooooh, ok. Dropping it!");
          convo.next();
        }
      },
      {
        default: true,
        callback: function(res, convo) {
          convo.repeat();
          convo.next();
        }
      }
    ]);
  }

  bot.startConversation(msg, askMake); 
});

