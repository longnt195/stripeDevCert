<?php header('Access-Control-Allow-Origin: *');
use DI\Container;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Monolog\Handler\StreamHandler;
use Slim\Exception\HttpNotFoundException;

// TODO: Integrate Stripe
use Stripe\StripeClient;

require './vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(dirname(__DIR__, 1));
$dotenv->load();

require './config/config.php';

AppFactory::setContainer(new Container());

$app = AppFactory::create();

/**
 * Add Error Middleware
 *
 * @param bool                  $displayErrorDetails -> Should be set to false in production
 * @param bool                  $logErrors -> Parameter is passed to the default ErrorHandler
 * @param bool                  $logErrorDetails -> Display error details in error log
 * @param LoggerInterface|null  $logger -> Optional PSR-3 Logger  
 *
 * Note: This middleware should be added last. It will not handle any exceptions/errors
 * for middleware added after it.
 */
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// Instantiate the logger as a dependency
$container = $app->getContainer();

// Instantiate the logger as a dependency
$container->set('logger',  function ($c) {
  $logger = new Monolog\Logger('pay-challenge');
  //uncomment the code below to add a logger you can use during development 
  $logger->pushProcessor(new Monolog\Processor\UidProcessor());
  $stream_handler = new StreamHandler("php://stdout");
  $logger->pushHandler($stream_handler);
  // $logger->pushHandler(
  //   new Monolog\Handler\StreamHandler(
  //     __DIR__ . '/logs/app.log',
  //      \Monolog\Logger::DEBUG));
  
  return $logger;
});

// TODO: Integrate Stripe

$app->options('/{routes:.+}', function ($request, $response, $args) {
  return $response;
});

// $app->add(function ($req, $res, $next) {
//   $response = $next($req, $res);
//   return $response
//           ->withHeader('Access-Control-Allow-Origin', '*')
//           ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization, access-control-allow-origin')
//           ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
// });

// Fetch the Stripe publishable key
//
// Example call:
// curl -X GET http://localhost:4242/config \
//
// Returns: a JSON response of the pubblishable key
//   {
//        key: <STRIPE_PUBLISHABLE_KEY>
//   }
$app->get('/config', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
    $config = [
        'key' => getenv('STRIPE_PUBLISHABLE_KEY'),
    ];
    return $response->withJson($config);
});

$container->set('errorHandler',  function ($c) {
  return function ($request, $response, $exception) use ($c) {
    // try to return error message from Stripe API first, otherwise fall back to the full error
    if (property_exists($exception, 'jsonBody')
      && isset($exception->jsonBody['error'])
      && isset($exception->jsonBody['error']['message'])) {
        return $response->withStatus(500)
          ->withHeader('Content-Type', 'application/json')
          ->withJson([ 'error' => [ 'message' => $exception->jsonBody['error']['message'] ]]);
    }

    return $response->withStatus(500)
      ->withHeader('Content-Type', 'application/json')
      ->withJson([ 'error' => [ 'message' => strval($exception) ]]);
  };
});

/* 
 * Slim framework Helper function: anything that should happen before the request is 
 * handled should be added here. 
 */
// $app->add(function ($request, $response, $next) {
  
//   return $next($request, $response);
// });

function static_file($path, Response $response) {
  try {
    $full_path = dirname(__DIR__) . '/' . getenv('STATIC_DIR') . $path;
    if(!file_exists($full_path)) {
        echo $full_path;
        return;
      throw new Exception();
    }
    return $response->write(file_get_contents($full_path));
  } catch (\Throwable $th) {
    return $response->write(file_get_contents('./public/static-file-error.html'));
  }
}

$app->get('/', function (Request $request, Response $response, array $args) {
  return static_file('/index.html', $response);
});

// Milestone 1: Signing up
// Shows the lesson sign up page.
$app->get('/lessons', function (Request $request, Response $response, array $args) { 
  return static_file('/lessons.html', $response);
});

$app->get('/success', function (Request $request, Response $response, array $args) {
    return static_file('/success.html', $response);
});


$app->post('/setup-intent-lesson', function (Request $request, Response $response, array $args) {
  //
  // Example of how to log into Playwright
  $logger = $this->get('logger');
  $logger->info('Reached POST /setup-intent-lesson');
  // TODO: Integrate Stripe
    $email = $request->getParam('email');
    $lessonId = $request->getParam('lessonId') . '_lesson';
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
    
    $customers = $stripe->customers->all([
        'email' => $email
    ]);
    if ($customers->data) {
        return $response->withJson(['customer' => $customers->data[0]->id]);
    }

    $lessonTime = $request->getParam('lessonTime');
    
    $customer = $stripe->customers->create([
        'name' => $request->getParam('name'),
        'email' => $email,
        'metadata' => [
            $lessonId => $lessonTime
        ]
    ]);
    $setupIntents = $stripe->setupIntents->create([
        'customer' => $customer->id,
        'payment_method_types' => ['card'],
        'usage' => 'off_session'
    ]);
    return $response->withJson(['clientSecret' => $setupIntents->client_secret]);
});

$app->post('/lessons', function (Request $request, Response $response, array $args) {
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
//    $checkout = $stripe->checkout->sessions->create([
//        'mode' => 'setup',
//        'payment_method_types' => ['card'],
//        'success_url' => 'http://localhost:4242/success?sessionId={CHECKOUT_SESSION_ID}',
//        'cancel_url' => 'http://localhost:4242/cancel',
//        'customer_email' => $request->getParam('email'),
//        'expand' => ['setup_intent'],
//    ]);
    
    $paymentMethod = $stripe->paymentMethods->retrieve(
        $request->getParam('payment_method')
    );
    
    $customer = $stripe->customers->retrieve($paymentMethod->customer);

    $stripe->paymentMethods->update(
        $request->getParam('payment_method'),
        ['billing_details' => [
            'name' => $customer->name,
            'email' => $customer->email
        ]]
    );
    
    $result = [
        'customer' => $paymentMethod->customer, 
        'last4' => $paymentMethod->card->last4
    ];
    
    $response->withStatus(303);
    return $response->withJson($result);
});

$app->get('/payment-method-details/{paymentId}', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
});



/**
 * Milestone 2
 * Authorize a payment for a lesson
 *
 * Parameters:
 * customer_id: id of the customer
 * amount: amount of the lesson in cents
 * description: a description of this lesson
 *
 * Example call:
 * curl -X POST http://localhost:4242/schdeule-lesson \
 *  -d customer_id=cus_GlY8vzEaWTFmps \
 *  -d amount=4500 \
 *  -d description="Lesson on Feb 25th"
 *
 * Returns: a JSON response of one of the following forms:
 * For a successful payment, return the Payment Intent:
 *   {
 *        payment: <payment_intent>
 *    }
 *
 * For errors:
 *  {
 *    error:
 *       code: the code returned from the Stripe error if there was one
 *       message: the message returned from the Stripe error. if no Payment Method was
 *         found for that customer return an msg "no payment methods found for <customer_id>"
 *    payment_intent_id: if a Payment Intent was created but not successfully authorized
 * }
 */
$app->post('/schedule-lesson', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
    try {
        $paymentMethods = $stripe->customers->allPaymentMethods($request->getParam('customer_id'), ['type' => 'card', 'limit' => 1]);
        if ($paymentMethods->data) {
            $paymentMethod = $paymentMethods->data[0]->id;
        }
        $paymentIntent = $stripe->paymentIntents->create([
            'customer' => $request->getParam('customer_id'),
            'amount' => $request->getParam('amount'),
            'currency' => 'usd',
            'payment_method' => $paymentMethod ?? '',
            'description' => $request->getParam('description'),
            'payment_method_types' => ['card'],
            'capture_method' => 'manual',
            'confirmation_method' => 'manual',
            'confirm' => true,
            'metadata' => ['type' => 'lessons-payment'],
        ]);

        $result = ['payment' => $paymentIntent];
    } catch (\Stripe\Exception\InvalidRequestException $e) {
        $result = [
            'error' => [
                'code' => $e->getStripeCode(),
                'message' => $e->getMessage()
            ]
        ];
    }
    
    return $response->withJson($result);
});


/*
 * Milestone 2: '/complete-lesson-payment'
 * Capture a payment for a lesson.
 *
 * Parameters:
 * amount: (optional) amount to capture if different than the original amount authorized
 *
 * Example call:
 * curl -X POST http://localhost:4242/complete_lesson_payment \
 *  -d payment_intent_id=pi_XXX \
 *  -d amount=4500
 *
 * Returns: a JSON response of one of the following forms:
 *
 * For a successful payment, return the Payment Intent:
 *   {
 *        payment: <payment_intent>
 *    }
 *
 * for errors:
 *  {
 *    error:
 *       code: the code returned from the error
 *       message: the message returned from the error from Stripe
 * }
 */
$app->post('/complete-lesson-payment', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
    try {
        $paymentIntent = $stripe->paymentIntents->retrieve($request->getParam('payment_intent_id'), []);
        $capture = $stripe->paymentIntents->capture($paymentIntent->id, [
            'amount_to_capture' => $request->getParam('amount')
        ]);

        $result = ['payment' => $capture];
    } catch (\Stripe\Exception\InvalidRequestException $e) {
        $result = [
            'error' => [
                'code' => $e->getStripeCode(),
                'message' => $e->getMessage()
            ]
        ];
    }

    return $response->withJson($result);
});


/*
 * Milestone 2: '/refund-lesson'
 * Refunds a lesson payment.  Refund the payment from the customer.
 * Sets the refund reason to 'requested_by_customer'
 *
 * Parameters:
 * payment_intent_id: the payment intent to refund
 * amount: (optional) amount to refund if different than the original payment
 *
 * Example call:
 * curl -X POST http://localhost:4242/refund-lesson \
 *   -d payment_intent_id=pi_XXX \
 *   -d amount=2500
 *
 * Returns
 * If the refund is successfully created returns a JSON response of the format:
 * 
 * {
 *   refund: refund.id
 * }
 *
 * If there was an error:
 *  {
 *    error: {
 *        code: e.error.code,
 *        message: e.error.message
 *      }
 *  }
 */
$app->post('/refund-lesson', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
    try {
        $paymentIntent = $stripe->paymentIntents->retrieve($request->getParam('payment_intent_id'), []);
        $refundParams = [
            'charge' => $paymentIntent->latest_charge
        ];
        if ($paymentIntent->amount != $request->getParam('amount')) {
            $refundParams['amount'] = $request->getParam('amount');
        }
        $refund = $stripe->refunds->create($refundParams);

        $result = ['refund' => $refund->id];
    } catch (\Stripe\Exception\InvalidRequestException $e) {
        $result = [
            'error' => [
                'code' => $e->getStripeCode(),
                'message' => $e->getMessage()
            ]
        ];
    }

    return $response->withJson($result);
});

$app->get('/refunds/{refundId}', function (Request $request, Response $response, array $args) {
    $stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
    try {
        $result = $stripe->refunds->retrieve($args['refundId'], []);
    } catch (\Stripe\Exception\InvalidRequestException $e) {
        $result = [
            'error' => [
                'code' => $e->getStripeCode(),
                'message' => $e->getMessage()
            ]
        ];
    }
    return $response->withJson($result);
});

/**
 * Milestone 3: Managing account info
 * Displays the account update page for a given customer
 */
$app->get('/account-update/{customer_id}', function (Request $request, Response $response, array $args) {
  return static_file('/account-update.html', $response);
});


/*
 * Milestone 3: '/delete-account'
 * Deletes a customer object if there are no uncaptured payment intents for them.
 *
 * Parameters: 
 *   customer_id: the id of the customer to delete
 *
 * Example request
 *   curl -X POST http://localhost:4242/delete-account \
 *    -d customer_id=cusXXX
 *
 * Returns 1 of 3 responses:
 * If the customer had no uncaptured charges and was successfully deleted returns the response:
 *   {
 *        deleted: true
 *   }
 *
 * If the customer had uncaptured payment intents, return a list of the payment intent ids:
 *   {
 *     uncaptured_payments: ids of any uncaptured payment intents
 *   }
 *
 * If there was an error:
 *  {
 *    error: {
 *        code: e.error.code,
 *        message: e.error.message
 *      }
 *  }
 */
$app->post('/delete-account/{customer_id}', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
});

/* 
 * Milestone 4: '/calculate-lesson-total'
 * Returns the total amounts for payments for lessons, ignoring payments
 * for videos and concert tickets, ranging over the last 36 hours.
 *
 * Example call: curl -X GET http://localhost:4242/calculate-lesson-total
 *
 * Returns a JSON response of the format:
 * {
 *      payment_total: Total before fees and refunds (including disputes), and excluding payments
 *         that haven't yet been captured.
 *      fee_total: Total amount in fees that the store has paid to Stripe
 *      net_total: Total amount the store has collected from payments, minus their fees.
 * }
 */
$app->get('/calculate-lesson-total', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
});


/*
 * Milestone 4: '/find-customers-with-failed-payments'
 * Returns any customer who meets the following conditions:
 * The last attempt to make a payment for that customer failed.
 * The payment method associated with that customer is the same payment method used
 * for the failed payment, in other words, the customer has not yet supplied a new payment method.
 *
 * Example request: curl -X GET http://localhost:4242/find-customers-with-failed-payments
 *
 * Returns a JSON response with information about each customer identified and their associated last payment
 * attempt and, info about the payment method on file.
 * [
 *   {
 *     customer: {
 *       id: customer.id,
 *       email: customer.email,
 *       name: customer.name
 *     },
 *     payment_intent: {
 *       created: created timestamp for the payment intent
 *       description: description from the payment intent
 *       status: the status of the payment intent
 *       error: the reason that the payment attempt was declined
 *     },
 *     payment_method: {
 *       last4: last four of the card stored on the customer
 *       brand: brand of the card stored on the customer
 *     }
 *   },
 *   {},
 *   {},
 * ]
 */
$app->get('/find-customers-with-failed-payments', function (Request $request, Response $response, array $args) {
  // TODO: Integrate Stripe
});

$app->map(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], '/{routes:.+}', function($req, $res) {
  $handler = $this->notFoundHandler; // handle using the default Slim page not found handler
  return $handler($req, $res);
});

$app->run();
