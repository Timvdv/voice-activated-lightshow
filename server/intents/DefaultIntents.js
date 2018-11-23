const fetch = require("node-fetch");

let username = null;
let access_token = null;
let lights = [];

// @TODO: Create privacy policy pages

// @TODO: Create demo video

// @TODO: Create product page (optional?)

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    // Check if it's the right intent
    const { request } = handlerInput.requestEnvelope;

    return request.type === "LaunchRequest";
  },
  async handle(handlerInput) {
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
    await stopLightshow();

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

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
};

async function linkBridge(handlerInput) {
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
    const request = await fetch("https://api.meethue.com/bridge/0/config", {
      method: "PUT",
      body: JSON.stringify({ linkbutton: true }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    });

    const json_result = await request.json();

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

      if (light_id < 10) {
        lights.push(parseInt(light));
      }
    }

    startLightshow(lights);

    const ssml_response = `
      <speak>
        Enjoy this amazing lightshow
        <audio src='https://s3.eu-central-1.amazonaws.com/custom-voice-storage/disco.mp3'/> 
      </speak>
      `;

    return handlerInput.responseBuilder
      .speak(ssml_response)
      .getResponse();

  } catch (e) {
    console.log(e);
    return handlerInput.responseBuilder
      .speak("Sorry! Something went wrong")
      .getResponse();
  }
}

/**
 * The actual lightshow
 */
async function startLightshow(lights) {
  let lightshow_counter = 0;

  // The first part takes about 2500 to start
  lightshow_counter += 2500;

  const colors_one = [12750, 46920, 25500];
  const colors_two = [65535, 21845, 12750];
  const colors_three = [65535, 0, 12750];
  const colors_four = [0, 21845, 0];

  setTimeout(() => {
    lights.map((light, index) => {
      blinkLight(light, colors_one[index]);
    });
  }, lightshow_counter);

  lightshow_counter += 15000;

  setTimeout(() => {
    lights.map((light, index) => {
      setColor(light, colors_three[index]);
    });

    setTimeout(() => {
      lights.map((light, index) => {
        setColor(light, colors_four[index]);
      });
    }, 1500);

    setTimeout(() => {
      lights.map((light, index) => {
        setColor(light, colors_three[index]);
      });
    }, 3000);

    setTimeout(() => {
      lights.map((light, index) => {
        setColor(light, colors_four[index]);
      });
    }, 4500);
  }, lightshow_counter);

  lightshow_counter += 4500;

  setTimeout(() => {
    lights.map((light, index) => {
      blinkLight(light, colors_two[index]);
    });
  }, lightshow_counter);
}

/**
 * Set the color by ID
 */
async function setColor(id, color) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/lights/${id}/state`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: true,
        hue: color
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
async function blinkLight(id, color) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/lights/${id}/state`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: true,
        hue: color,
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
  lights.map(async id => {
    await turnOffLight(id);
  });
}

async function turnOffLight(id) {
  const control_the_lights = await fetch(
    `https://api.meethue.com/bridge/${username}/lights/${id}/state`,
    {
      method: "PUT",
      body: JSON.stringify({
        on: false
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
  StopIntentHandler
};
