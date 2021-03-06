const fetch = require("node-fetch");

const { getHandlerInput } = require("./shared");

let username = null;
let access_token = null;
let lights = [];

let isPlaying = false;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    // Check if it's the right intent
    const { request } = handlerInput.requestEnvelope;

    return request.type === "LaunchRequest";
  },
  async handle(handlerInput) {
    const { attributes } = getHandlerInput(handlerInput);

    attributes.isPlaying = true;
    // wrong way but attributes dont work 
    isPlaying = true;

    return linkBridge(handlerInput);
  }
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.StopIntent"
    );
  },
  async handle(handlerInput) {
    const { attributes } = getHandlerInput(handlerInput);

    attributes.isPlaying = false;
    isPlaying = false;

    await setSceneColor(0, 0);

    return handlerInput.responseBuilder
      .speak("See you next time!");
  }
};

const CancelIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.CancelIntent"
    );
  },
  async handle(handlerInput) {

    const { attributes } = getHandlerInput(handlerInput);

    attributes.isPlaying = false;
    isPlaying = false;

    await setSceneColor(0, 0);

    return handlerInput.responseBuilder.speak("See you next time!");
  }
};

const StartLightshowHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "StartLightshow"
    );
  },
  handle(handlerInput) {
    return linkBridge(handlerInput);
  }
};

const StopLightshowHandler = {
  canHandle(handlerInput) {
    const { request, attributes } = getHandlerInput(handlerInput);

    attributes.isPlaying = false;
    isPlaying = false;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "StopLightshow"
    );
  },
  async handle(handlerInput) {
    await setSceneColor(0, 0);

    console.log("Custom stop handler");

    return handlerInput.responseBuilder
      .speak("Alright, I stopped the lightshow")
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  async handle(handlerInput, error) {
    const { response, attributes } = getHandlerInput(handlerInput);
    
    attributes.isPlaying = false;
    isPlaying = false;

    await setSceneColor(0, 0);
    
    console.log(`Error handled: ${error.message}`);

    return response
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
};

async function linkBridge(handlerInput) {

  const { response, attributes } = getHandlerInput(handlerInput);

  if (
    handlerInput.requestEnvelope &&
    handlerInput.requestEnvelope.session &&
    handlerInput.requestEnvelope.session.user &&
    !handlerInput.requestEnvelope.session.user.accessToken
  ) {
    return response
      .speak("You have to be logged in to use the lightshow")
      .withLinkAccountCard()
      .getResponse();
  }

  access_token = handlerInput.requestEnvelope.session.user.accessToken;

  try {
    // Refresh token not working yet

    // const refresh = await fetch("https://api.meethue.com/oauth2/refresh?grant_type=refresh_token", {
    //   method: "POST",
    //   body: JSON.stringify({}),
    //   headers: {
    //     Authorization: `Bearer ${access_token}`,
    //     "Content-Type": "application/json"
    //   }
    // });

    // const refresh_result = await refresh.json();

    // console.log(refresh_result);

    const request = await fetch("https://api.meethue.com/bridge/0/config", {
      method: "PUT",
      body: JSON.stringify({ linkbutton: true }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    });

    const json_result = await request.json();

    if(json_result && json_result.fault) {

      // if(json_result.faultstring === "Access Token expired") {
      //   const renew = await fetch("https://api.meethue.com/oauth2/refresh?grant_type=refresh_token", {
      //     method: "POST",
      //     body: new URLSearchParams(`refresh_token=${access_token}`),
      //     headers: {
      //       Authorization: `Bearer ${access_token}`,
      //       "Content-Type": "application/x-www-form-urlencoded"
      //     }
      //   });
      // }

      return handlerInput.responseBuilder
        .speak("Sorry! Your access token expired, please try unlinking the app and then linking the app again. This should be fixed soon.")
        .getResponse();
      // throw new Error(json_result.fault.faultstring)
    }

    const add_bridge_whitelist = await fetch("https://api.meethue.com/bridge", {
      method: "POST",
      body: JSON.stringify({ devicetype: "voice-lightshow" }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    });

    const add_bridge_whitelist_json = await add_bridge_whitelist.json();

    username = add_bridge_whitelist_json[0].success.username;

    /**
     * GET ALL THE LIGHTS
     */
    const get_the_lights = await fetch(
      `https://api.meethue.com/bridge/${username}/lights`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const get_the_lights_json = await get_the_lights.json();

    for (light in get_the_lights_json) {
      const light_id = parseInt(light);

      if (light_id < 14) {
        lights.push(parseInt(light));
      }
    }

    startLightshow(lights, handlerInput);

    const ssml_response = `
      <speak>
        Enjoy this amazing lightshow
        <audio src='https://s3.eu-central-1.amazonaws.com/custom-voice-storage/disco.mp3'/> 
      </speak>
      `;

    return handlerInput.responseBuilder
      .speak(ssml_response)
      .reprompt('Enjoy ')
      .withSimpleCard('Lightshow', 'Enjoy this amazing lightshow')
      .getResponse();
  } catch (e) {
    console.log(e);
    return handlerInput.responseBuilder
      .speak("Sorry! Something went wrong")
      .getResponse();
  }
}

/**
 * When the sessions ends for some reason.
 */
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log(handlerInput.requestEnvelope);
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  async handle(handlerInput) {
    console.log("Session ended");
    await setSceneColor(0, 0);
    
    return handlerInput.responseBuilder.getResponse();
  }
};

/**
 * The actual lightshow
 */
async function startLightshow(lights, handlerInput) {
  let lightshow_counter = 0;

  let { attributes } = getHandlerInput(handlerInput);

  // The first part takes about 2500 to start
  lightshow_counter += 2500;

  const colors_one = [
    12750,
    46920,
    25500,
    12750,
    46920,
    25500,
    12750,
    46920,
    25500
  ];
  const colors_two = [
    65535,
    21845,
    12750,
    65535,
    21845,
    12750,
    65535,
    21845,
    12750
  ];
  const colors_three = [
    65535,
    46920,
    12750,
    65535,
    46920,
    12750,
    65535,
    46920,
    12750
  ];
  const colors_four = [50000, 21845, 0, 50000, 21845, 0, 50000, 21845, 0];
  const colors_five = [0, 21845, 50000, 0, 21845, 50000, 0, 21845, 50000];

  setTimeout(() => {
    lights.map((light, index) => {
      blinkLight(light, colors_one[index], 180);
    });
  }, lightshow_counter);

  lightshow_counter += 15000;

  setTimeout(() => {
    let { attributes } = getHandlerInput(handlerInput);

    console.log(attributes);

    if(isPlaying) {
      lights.map((light, index) => {
        blinkLight(light, colors_two[index]);
      });
    }
  }, lightshow_counter);

  lightshow_counter += 15000;

  setTimeout(() => {
    let { attributes } = getHandlerInput(handlerInput);

    console.log(attributes);

    if(isPlaying) {
      lights.map((light, index) => {
        blinkLight(light, colors_three[index], 180);
      });
    }
  }, lightshow_counter);

  lightshow_counter += 500;

  setTimeout(() => {
    setSceneColor(0, 0);
  }, lightshow_counter);

}

/**
 * Set the color by ID
 */
async function setColor(id, color, saturation) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/lights/${id}/state`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: true,
        hue: color,
        sat: saturation
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const control_the_lights_json = await control_the_lights.json();
}

/**
 * Blink the light by ID
 */
async function blinkLight(id, color, saturation) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/lights/${id}/state`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: true,
        hue: color,
        sat: saturation,
        alert: "lselect"
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const control_the_lights_json = await control_the_lights.json();
}

async function stopLightshow(id) {
  turnOffLights();
}

async function turnOffLights() {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/groups/0/action`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: false,
        alert: "none"
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const control_the_lights_json = await control_the_lights.json();
}

/**
 * Start a scene
 */
async function setSceneColor(color, saturation) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/groups/0/action`,
    {
      method: "PUT",
      body: JSON.stringify({
          on: true,
          hue: color,
          sat: saturation,
          alert: "none"
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const control_the_lights_json = await control_the_lights.json();
}

module.exports = {
  StartLightshowHandler,
  LaunchRequestHandler,
  ErrorHandler,
  StopIntentHandler,
  CancelIntentHandler,
  StopLightshowHandler,
  SessionEndedRequestHandler
};
