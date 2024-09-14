/**
 * Shows the "#completed-view" div after a customer updates their card.
 * TODO: finish this to display the customers card information showing within the
 * #account-information div.
 */
function showCustomerExistsError(errorMsg) {
  var errorMsgDiv = document.querySelector("#customer-exists-error");
  errorMsgDiv.removeAttribute("hidden");
  changeLoadingState(false);
  // TODO: Integrate Stripe
}

const updateComplete = function() {
  // TODO: Integrate Stripe
  document.querySelector(".sr-payment-form").classList.add("hidden");
  document.querySelector(".completed-view").classList.remove("hidden");
  setTimeout(function() {
      document.querySelector(".completed-view").classList.add("expand");
    }, 200);
  changeLoadingState(false);
  document.querySelector("#submit").classList.add("hidden");
}

async function showDetails(response) {
    const customer = await response.customer;
    const card = response.card;

    document.querySelector('#name').value = customer.name;
    document.querySelector('#email').value = customer.email;

    document.querySelector('#billing-email').innerText = customer.email;
    document.querySelector('#card-exp-month').innerText = card.exp_month;
    document.querySelector('#card-exp-year').innerText = card.exp_year;
    document.querySelector('#card-last4').innerText = card.last4;
}

// TODO: Integrate Stripe
