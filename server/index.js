require("dotenv").config();

const express = require("express");
const Alexa = require("ask-sdk");
const verifier = require('alexa-verifier-middleware');

const app = express();
const port = 3033;


const {
  LaunchRequestHandler,
  StartLightshowHandler,
  StopIntentHandler,
  CancelIntentHandler,
  ErrorHandler,
  StopLightshowHandler,
  SessionEndedRequestHandler,
} = require("./intents/DefaultIntents");

let skill = null;

app.use(verifier);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/static', express.static(__dirname + `${ process.env.LOCAL_CLIENT_PATH || "/client"}/build/static`));
app.use('/', express.static(__dirname + `${ process.env.LOCAL_CLIENT_PATH || "/client"}/build`));
app.use('/tos', express.static(__dirname + `${ process.env.LOCAL_CLIENT_PATH || "/client"}/build`));
app.use('/privacy', express.static(__dirname + `${ process.env.LOCAL_CLIENT_PATH || "/client"}/build`));
app.use('/video', express.static(__dirname + `${ process.env.LOCAL_CLIENT_PATH || "/client"}/build`));

app.post("/alexa", async (req, res) => {
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        LaunchRequestHandler,
        StartLightshowHandler,
        CancelIntentHandler,
        StopIntentHandler,
        StopLightshowHandler,
        SessionEndedRequestHandler
      )
      .addErrorHandlers(ErrorHandler)
      .create();
  }

  const context = {
    fail: () => {
      // Simply fail with internal server error
      res.sendStatus(500);
    },
    succeed: data => {
      res.send(data);
    }
  };

  try {
    const alexaJson = await skill.invoke(req.body, context);

    return res.json(alexaJson);
  } catch (error) {
    console.log("error");
    console.log(error);
    res.json(error).status(500);
  }
});

app.listen(port, () => console.log(`Voice lightshow listening on port ${port}!`));
