/** Common helpers used on multiple pages */

// TODO: Integrate Stripe

// handle the situation where fetch doesn't retun an ok status code, for example if the server 500s
function handleErrors(response) {
  if (response.status >= 500) {
    throw Error(response.statusText);
  }
  return response;
}

//Toggle show/hide
function setVisibility(divId, showToggle) {
  if (showToggle) {
    document.getElementById(divId).classList.remove("hidden");
  } else {
    document.getElementById(divId).classList.add("hidden");
  }
}

// Toggles a spinner.
var changeLoadingState = function (isLoading) {
  if (isLoading) {
    document.querySelector("button").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("button").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
};

//display an error message in the card errors section on a page
var displayError = function (errorMsg) {
  console.error(errorMsg);
  changeLoadingState(false);
  var errorMsgField = document.querySelector("#card-errors");
  errorMsgField.textContent = errorMsg;
  setTimeout(function () {
    errorMsgField.textContent = "";
  }, 10 * 1000);
};

// TODO: Integrate Stripe
