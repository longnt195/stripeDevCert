/* --- Functions we expect you will need to modify to complete the solution -- */
/**
 * Shows the "#customer-exists-error" div when a customer already exists
 * To complete: finish this to display the customers email address and a link to their account_update form
 */
var showCustomerExistsError = function(customer_id) {
  var errorMsgDiv = document.querySelector("#customer-exists-error");
  errorMsgDiv.removeAttribute("hidden");
  document.getElementById("checkout-btn").classList.add("hidden");
  errorMsgDiv.removeAttribute("hidden");
  changeLoadingState(false);
  // TODO: Integrate Stripe
}



/**** ----  Additional helpers. *****/

const checkForCompleteInfo = function () {
  learnerEmail = document.getElementById('email').value;
  learnerName = document.getElementById('name').value;
  if (learnerEmail !== "" && learnerName !== "") {
    document.getElementById('checkout-btn').disabled = false;
  } else {
    document.getElementById('checkout-btn').disabled = true;
  }
}

/* Shows a success / error message when the payment is complete */
var signupComplete = function(json) {
  document.querySelector(".sr-payment-form").classList.add("hidden");
  document.querySelector(".completed-view").classList.remove("hidden");
  setTimeout(function() {
      document.querySelector(".completed-view").classList.add("expand");
    }, 200);
  changeLoadingState(false);
  document.getElementById("checkout-btn").disabled = true;
  document.getElementById("submit").disabled = true;
  // TODO: Integrate Stripe
};


/* logic to display available lesson times and toggle the display of the sign up form . */
function appendLeadingZeroes(n){
  if(n <= 9){
    return "0" + n;
  }
  return n
}
const months = ["Jan", "Feb", "Mar","Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
let firstSession = new Date();
firstSession.setDate(firstSession.getDate()+9);
let firstSess= appendLeadingZeroes(firstSession.getDate()) + " " + months[firstSession.getMonth()];
let firstDate = `${firstSess} 3:00 p.m.`;
let firstLineItem = `Guitar Lesson request: ${firstDate}`;


let secondSession = new Date();
secondSession.setDate(secondSession.getDate()+14);
let secondSess= appendLeadingZeroes(secondSession.getDate()) + " " + months[secondSession.getMonth()] ;
let secondDate = `${secondSess} 4:00 p.m.`;
let secondLineItem = `Guitar Lesson request: ${secondDate}`;


let thirdSession = new Date();
thirdSession.setDate(thirdSession.getDate()+21);
let thirdSess= appendLeadingZeroes(thirdSession.getDate()) + " " + months[thirdSession.getMonth()];
let thirdDate = `${thirdSess} 5:00 p.m.`;
let thirdLineItem = `Guitar Lesson request: ${thirdDate}`;

const allitems = {
  first : {
    itemId: 'first',
    title: firstDate,
    date: firstSess,
    time: '3:00 p.m.',
  },
  second : {
    itemId: 'second',
    title: secondDate,
    date: secondSess,
    time: '4:00 p.m.',
  },
  third : {
    itemId: 'third',
    title: thirdDate,
    date: thirdSess,
    time: '5:00 p.m.',
  }
};

/**
 * Generates the HTML for the lesson sign up options
 */
function generateHtmlForitemsPage(){
  function generateHtmlForSingleitem(id, date, time){
    result = `
        <div class="sr-item"
        id=\'${id}\'
        onclick="toggleItem(\'${id}\')"
                >
          <div class="sr-lesson-title">
            <div class="sr-lesson-date">${date}</div>
            <div class="sr-lesson-time">${time}</div>
          </div>
          <button class="sr-button-label">
            Book Now!
          </button>
        </div>
      `;
    return result;
  }
  var html = '';
  Object.values(allitems).forEach((item) => {
    html += generateHtmlForSingleitem(item.itemId, item.date, item.time);
  });

  document.getElementById('sr-items').innerHTML += html;
}


/**
 * Shows the registration form if session is selected.
 */
var toggleRegForm = function(showRegForm) {
  // TODO: Integrate Stripe
  var formElts = document.querySelectorAll('.sr-form-container');
  if (showRegForm) {
      enableRegForm(formElts);
  } else {
      disableRegForm(formElts);
  }
}

var enableRegForm = function(formElts) {
    formElts.forEach(function(elt) {
      elt.classList.remove('hidden');
    });
}
var disableRegForm = function(formElts) {
    formElts.forEach(function(elt) {
      elt.classList.add('hidden');
    });
}

toggleRegForm(false);
// TODO: Integrate Stripe

document.addEventListener('DOMContentLoaded', async () => {
  var form = document.getElementById("lesson-form-wrapper");
  const {key} = await fetch('/config').then((r) => r.json());
  const stripe = Stripe(key);

  const appearance = { /* appearance */};
  const options = { /* options */};
  document.getElementById("checkout-btn").onclick = async (e) => {
    e.preventDefault();
    document.getElementById("customer-exists-error").hidden = true;
    var srItem = document.getElementsByClassName('sr-item selected')[0],
        date = srItem.getElementsByClassName('sr-lesson-date')[0].textContent,
        time = srItem.getElementsByClassName('sr-lesson-time')[0].textContent;
    time = time.replace('.', '');
    var currDate = new Date(`${date} ${time}`),
    lessonTime = currDate.toLocaleString('default', { day: '2-digit', timeZone: 'America/New_York' }) + ' ' +
    currDate.toLocaleString('default', { month: 'short', timeZone: 'America/New_York' });
    
    
    const {clientSecret, customer} = await fetch('/setup-intent-lesson', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        lessonId: srItem.id,
        lessonTime: lessonTime
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
    }).then((r) => r.json());
    
    if (customer) {
      document.getElementById("customer-exists-error").hidden = false;
      document.getElementById("account_link").innerHTML =
          `<a href="/account-update/${customer}">Account Update</a>`;
      return;
    }
    const elements = stripe.elements({clientSecret, appearance});
    const paymentElement = elements.create('payment', options);
    paymentElement.mount('#payment-element');

    document.getElementById("checkout-btn").classList.add("hidden");
    document.getElementById("payment-element").classList.remove('hidden');
    document.getElementById("submit").classList.remove("hidden");

    var payment_method = '';
    async function handleSubmit(event) {
      event.preventDefault();
      changeLoadingState(true);
      document.getElementById("submit").disabled = true;
      const setup = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/return.html`,
        },
        'redirect': 'if_required'
      });
      if (setup.error) {
        displayError(setup.error.message);
        document.getElementById("submit").disabled = false;
      } else {
        payment_method = setup.setupIntent.payment_method;
      }

      if (payment_method) {
        var data = new FormData(event.target);
        data.append('payment_method', payment_method);
        data.append('lessonId', srItem.id);
        data.append('lessonTime', lessonTime);
        const {customer, last4, error} = await fetch(event.target.action, {
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
        document.getElementById("submit").disabled = false;
        setVisibility('payment-element', false);
        setVisibility('submit', false);
        setVisibility('checkout-btn', true);

        if (!error) {
          form.reset();
          form.getElementsByClassName('payment-view')[0].classList.add('hidden');
          form.getElementsByClassName('completed-view')[0].classList.remove('hidden');
          document.getElementById("customer-id").innerHTML = customer;
          document.getElementById("last4").innerHTML = last4;
        }
      }
    }
    form.addEventListener("submit", handleSubmit);
  }
});

generateHtmlForitemsPage();

let toggleItem = function(id) {
  clear();
  allitems[id].selected = !allitems[id].selected;
  let dateElt = document.getElementById(id);
  let summaryTableItem = document.getElementById(id).textContent;
  if (allitems[id].selected) {
    dateElt.classList.add('selected');
    document.querySelector("#summary-table").innerHTML = `<font>You have requested a lesson for ${summaryTableItem} Please complete the registration form to reserve your lesson.</font>`;
    toggleRegForm(true);
  }
  else {
    dateElt.classList.remove('selected');
    document.querySelector("#summary-table").textContent = "";
    toggleRegForm(false);
  }
  allitems[id].selected = !allitems[id].selected;
}

let clear = function () {
  let allElt = document.querySelectorAll(".sr-item");
  allElt.forEach (function(elt) {
    elt.classList.remove("selected");
  });
};
