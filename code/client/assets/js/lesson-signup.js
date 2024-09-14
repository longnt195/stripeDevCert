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
