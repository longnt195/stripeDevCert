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
    document.getElementById("customer-exists-message").innerHTML = errorMsg;
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
const customerId = window.location.pathname.split('/').at(-1);
document.addEventListener('DOMContentLoaded', async () => {
    const {key} = await fetch('/config').then((r) => r.json());
    const stripe = Stripe(key);
    const customerRes = await fetch('/get-customer', {
        method: 'POST',
        body: JSON.stringify({
            customer_id: customerId
        }),
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    }).then((r) => r.json());
    showDetails(customerRes).then();

    document.getElementById("checkout-btn").onclick = async (e) => {
        e.preventDefault();
        document.getElementById("customer-exists-error").hidden = true;

        const {clientSecret, customer} = await fetch('/setup-intent-update', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                customer_id: customerId,
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }
        }).then((r) => r.json());

        if (customer) {
            showCustomerExistsError('Customer email already exists!');
            return;
        }

        const elements = stripe.elements({clientSecret});
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        setVisibility('payment-element', true);
        setVisibility('checkout-btn', false);
        setVisibility('submit', true);
        
        //confirm-btn
        var form = document.getElementById("lesson-form-wrapper");
        var payment_method = '';
        async function handleSubmit(event) {
            event.preventDefault();
            changeLoadingState(true);
            const setup = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/return.html`,
                },
                'redirect': 'if_required'
            });
            if (setup.error) {
                displayError(setup.error.message);
            } else {
                payment_method = setup.setupIntent.payment_method;
            }

            if (payment_method) {
                var data = new FormData(event.target);
                data.append('payment_method', payment_method);
                const action = event.target.action + '/' + customerId; 
                const {customer, card, error} = await fetch(action, {
                    method: form.method,
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                }).then((r) => r.json());

                if (error === 'existed') {
                    showCustomerExistsError('Customer email already exists!');
                }

                changeLoadingState(false);
                setVisibility('payment-element', false);
                setVisibility('submit', false);
                setVisibility('checkout-btn', true);
                
                if (!error) {
                    await showDetails({customer, card});
                }
                
            }
        }
        form.addEventListener("submit", handleSubmit);
    }
});
