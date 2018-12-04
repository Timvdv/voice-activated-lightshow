module.exports.getHandlerInput = handlerInput => {
  const request = handlerInput.requestEnvelope.request;
  const response = handlerInput.responseBuilder;
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const session = (handlerInput.requestEnvelope && handlerInput.requestEnvelope.session);

  return {
    request,
    response,
    attributes,
    session
  };
}