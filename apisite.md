<?php

use App\Http\Controllers\Api\Accounts\AddressController;
use App\Http\Controllers\Api\Accounts\AuthController;
use App\Http\Controllers\Api\Accounts\AuthUserController;
use App\Http\Controllers\Api\Accounts\DiscountCardController;
use App\Http\Controllers\Api\Accounts\FeedsController;
use App\Http\Controllers\Api\Accounts\FindErrorFormController;
use App\Http\Controllers\Api\Accounts\MailingController;
use App\Http\Controllers\Api\Accounts\PartnerFormController;
use App\Http\Controllers\Api\Accounts\PasswordResetController;
use App\Http\Controllers\Api\Accounts\UserController;
use App\Http\Controllers\Api\Accounts\UserProfileController;
use App\Http\Controllers\Api\Accounts\UsersFor1cController;
use App\Http\Controllers\Api\Accounts\VacancyFormController;
use App\Http\Controllers\Api\Main\MainActionsController;
use App\Http\Controllers\Api\Main\MainController;
use App\Http\Controllers\Api\Main\SubcategoryBrandBannerController;
use App\Http\Controllers\Api\Main\ViewedProductController;
use App\Http\Controllers\Api\MobileApp\AuthController as MobileAuthController;
use App\Http\Controllers\Api\MobileApp\DiscountCardsController as MobileDiscountCardsController;
use App\Http\Controllers\Api\MobileApp\UserDiscountCardsController as MobileUserDiscountCardsController;
use App\Http\Controllers\Api\MobileAppController;
use App\Http\Controllers\Api\Newsletter\ProductAvailabilitySubscriptionController;
use App\Http\Controllers\Api\Orders\CreditController;
use App\Http\Controllers\Api\Orders\DiscountCardCalculateController;
use App\Http\Controllers\Api\Orders\EasyCreditController;
use App\Http\Controllers\Api\Orders\IuteCreditController;
use App\Http\Controllers\Api\Orders\OrderController;
use App\Http\Controllers\Api\Orders\OrdersActionsController;
use App\Http\Controllers\Api\Orders\OrdersExportController;
use App\Http\Controllers\Api\Orders\TemporaryCartController;
use App\Http\Controllers\Api\Orders\UserPaymentsHistoryController;
use App\Http\Controllers\Api\Shop\AutocompleteController;
use App\Http\Controllers\Api\Shop\BrandController;
use App\Http\Controllers\Api\Shop\CategoryController;
use App\Http\Controllers\Api\Shop\FavoriteProductController;
use App\Http\Controllers\Api\Shop\ProductController;
use App\Http\Controllers\Api\Shop\PromoCodeController;
use App\Http\Controllers\Api\Shop\ReviewController;
use App\Http\Controllers\Api\Shop\StoreController;
use App\Http\Controllers\Api\Shop\SubCategoryController;
use App\Http\Controllers\Api\Shop\SubSubCategoryController;
use Illuminate\Support\Facades\Route;

$registerRoutes = function () {
    Route::prefix('auth/token')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth.token');
    });

    Route::prefix('auth')->middleware('auth.token')->group(function () {
        Route::get('users/me', [AuthUserController::class, 'me']);
        Route::put('users/me', [AuthUserController::class, 'updateMe']);
        Route::patch('users/me', [AuthUserController::class, 'updateMe']);
        Route::post('users/set_password', [AuthUserController::class, 'setPassword']);
    });

    Route::get('check-excel-status', [FeedsController::class, 'checkExcelStatus']);

    Route::prefix('accounts')->group(function () {
        Route::post('google-login', [AuthController::class, 'googleLogin']);
        Route::post('facebook-login', [AuthController::class, 'facebookLogin']);
        Route::get('check-token', [AuthController::class, 'checkToken']);
        Route::post('add-mail-for-mailing', [MailingController::class, 'addMailForMailing']);
        Route::get('feeds-file-last-changes', [FeedsController::class, 'feedsFileLastChanges']);

        Route::apiResource('users', UserController::class)
            ->only(['index', 'store', 'show', 'update'])
            ->whereNumber('user');
        Route::apiResource('address', AddressController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('user-profile', UserProfileController::class)->only(['update']);
        Route::apiResource('partner-form', PartnerFormController::class)->only(['store']);
        Route::apiResource('vacancy-form', VacancyFormController::class)->only(['store']);
        Route::apiResource('find-error-form', FindErrorFormController::class)->only(['store']);
        Route::apiResource('discount-cards', DiscountCardController::class)->only(['index', 'store', 'destroy']);
        Route::post('discount-cards/refresh', [DiscountCardController::class, 'refresh']);
    });

    Route::prefix('api')->group(function () {
        Route::post('phone_password_reset', [AuthController::class, 'phonePasswordReset']);
        Route::post('password_reset', [PasswordResetController::class, 'requestToken']);
        Route::post('password_reset/confirm', [PasswordResetController::class, 'confirm']);
        Route::post('password_reset/validate_token', [PasswordResetController::class, 'validateToken']);

        Route::prefix('newsletter')->group(function () {
            Route::apiResource(
                'product-availability-subscription',
                ProductAvailabilitySubscriptionController::class
            )->only(['store']);
        });

    });

    Route::prefix('main')->group(function () {
        Route::get('slider-category-for-home-page', [MainController::class, 'sliderCategoryForHomePage']);
        Route::get('slider-category-for-home-page/{slideCategoryForHomePage}', [MainController::class, 'sliderCategoryForHomePageShow']);
        Route::get('privacy-policy', [MainController::class, 'privacyPolicy']);
        Route::get('privacy-policy/{privacyPolicy}', [MainController::class, 'privacyPolicyShow']);
        Route::get('terms-of-use', [MainController::class, 'termsOfUse']);
        Route::get('terms-of-use/{termsOfUse}', [MainController::class, 'termsOfUseShow']);
        Route::get('slider-brands-for-home-page', [MainController::class, 'slideBrandsForHomePage']);
        Route::get('slider-brands-for-home-page/{slideBrandsForHomePage}', [MainController::class, 'slideBrandsForHomePageShow']);
        Route::get('home-page-slider', [MainController::class, 'slideHomePage']);
        Route::get('home-page-slider/{slideHomePage}', [MainController::class, 'slideHomePageShow']);
        Route::get('slides-popular-product', [MainController::class, 'slidePopularProduct']);
        Route::get('slider-discounted-product', [MainController::class, 'slideDiscountedProductForHomePage']);
        Route::get('slider-discounted-product/{slideDiscounted}', [MainController::class, 'slideDiscountedProductForHomePageShow']);
        Route::get('slider-promotions', [MainController::class, 'promotionsList']);
        Route::get('slider-promotions/{slug}', [MainController::class, 'promotionsShow']);
        Route::get('slider-new_products', [MainController::class, 'sliderNewProducts']);
        Route::get('about-company', [MainController::class, 'aboutCompany']);
        Route::get('about-company/{aboutCompany}', [MainController::class, 'aboutCompanyShow']);
        Route::get('delivery-page', [MainController::class, 'deliveryPage']);
        Route::get('delivery-page/{deliveryPage}', [MainController::class, 'deliveryPageShow']);
        Route::get('blog-category', [MainController::class, 'postCategory']);
        Route::get('blog-category/{postCategory}', [MainController::class, 'postCategoryShow']);
        Route::get('blog', [MainController::class, 'blog']);
        Route::get('blog/{slug}', [MainController::class, 'blogShow']);
        Route::get('how-to-make-order', [MainController::class, 'howToMakeOrder']);
        Route::get('how-to-make-order/{howToMakeOrder}', [MainController::class, 'howToMakeOrderShow']);
        Route::get('payment-page', [MainController::class, 'paymentPage']);
        Route::get('payment-page/{paymentPage}', [MainController::class, 'paymentPageShow']);
        Route::get('guarantees-page', [MainController::class, 'guaranteesPage']);
        Route::get('guarantees-page/{guaranteesPage}', [MainController::class, 'guaranteesPageShow']);
        Route::get('gift_card-page', [MainController::class, 'giftCardPage']);
        Route::get('gift_card-page/{giftCardPage}', [MainController::class, 'giftCardPageShow']);
        Route::get('credit-page', [MainController::class, 'creditPage']);
        Route::get('credit-page/{creditPage}', [MainController::class, 'creditPageShow']);
        Route::get('cashback-page', [MainController::class, 'cashbackPage']);
        Route::get('cashback-page/{cashbackPage}', [MainController::class, 'cashbackPageShow']);
        Route::get('partner-page', [MainController::class, 'partnerPage']);
        Route::get('partner-page/{partnerPage}', [MainController::class, 'partnerPageShow']);
        Route::get('certificate', [MainController::class, 'certificatePage']);
        Route::get('certificate/{certificatePage}', [MainController::class, 'certificatePageShow']);
        Route::get('contacts', [MainController::class, 'contacts']);
        Route::get('contacts/{contact}', [MainController::class, 'contactsShow']);
        Route::get('requisites', [MainController::class, 'requisites']);
        Route::get('requisites/{requisites}', [MainController::class, 'requisitesShow']);
        Route::get('vacancies', [MainController::class, 'vacancyPage']);
        Route::get('vacancies/{vacancyPage}', [MainController::class, 'vacancyPageShow']);
        Route::get('viewed-product', [ViewedProductController::class, 'index']);
        Route::post('viewed-product', [ViewedProductController::class, 'store']);
        Route::get('viewed-product/{viewedProduct}', [ViewedProductController::class, 'show']);
        Route::get('get-shops', [MainController::class, 'shops']);
        Route::get('social-projects', [MainController::class, 'socialProjects']);
        Route::get('social-projects/{slug}', [MainController::class, 'socialProjectsShow']);
        Route::get('get_meta_for_pages', [MainController::class, 'metaForPages']);
        Route::get('get_meta_for_pages/{metaForPage}', [MainController::class, 'metaForPagesShow']);
        Route::get('subcategory-brand-banner', [SubcategoryBrandBannerController::class, 'index']);
        Route::post('add_views_to_product', [MainActionsController::class, 'addViewsToProduct']);
        Route::get('test', [MainActionsController::class, 'test']);
    });

    Route::prefix('app/mobile')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('login', [MobileAuthController::class, 'login'])->middleware('throttle:5,1');
            Route::post('logout', [MobileAuthController::class, 'logout']);
            Route::get('me', [MobileAuthController::class, 'me']);
        });

        Route::get('products', [MobileAppController::class, 'products']);
        Route::get('discount-cards', [MobileDiscountCardsController::class, 'index']);
        Route::get('user/discount-cards', [MobileUserDiscountCardsController::class, 'index']);
    });

    Route::prefix('shop')->group(function () {
        Route::get('category-in-home_page', [CategoryController::class, 'index']);
        Route::get('category-in-home_page/{slug}', [CategoryController::class, 'show']);
        Route::get('subcategory', [SubCategoryController::class, 'index']);
        Route::get('subcategory/{slug}', [SubCategoryController::class, 'show']);
        Route::get('subsubcategory', [SubSubCategoryController::class, 'index']);
        Route::get('subsubcategory/{slug}', [SubSubCategoryController::class, 'show']);
        Route::get('product', [ProductController::class, 'index']);
        Route::get('product-autosuggest', [ProductController::class, 'autosuggest']);
        Route::get('product/attributes', [ProductController::class, 'attributes']);
        Route::get('product-search', [ProductController::class, 'search']);
        Route::get('product-search-list', [ProductController::class, 'searchList']);
        Route::get('product/{slug}', [ProductController::class, 'show'])->where('slug', '.*');
        Route::post('promocode', [PromoCodeController::class, 'store']);
        Route::get('brand', [BrandController::class, 'index']);
        Route::get('brand/{slug}', [BrandController::class, 'show']);
        Route::get('get-stores', [StoreController::class, 'index']);
        Route::get('favorite-products', [FavoriteProductController::class, 'index']);
        Route::post('favorite-products', [FavoriteProductController::class, 'store']);
        Route::delete('favorite-products/{favoriteProduct}', [FavoriteProductController::class, 'destroy']);
        Route::get('favorite-products-delete-all', [FavoriteProductController::class, 'deleteAll']);
        Route::get('reviews', [ReviewController::class, 'index']);
        Route::post('reviews', [ReviewController::class, 'store']);
        Route::get('change-diacritic', [ProductController::class, 'changeDiacritic']);
        Route::get('run_update_products', [ProductController::class, 'runUpdateProducts']);
        Route::get('run_update_products_available_balance_night', [ProductController::class, 'runUpdateProductsAvailableBalanceNight']);
    });

    Route::prefix('orders')->group(function () {
        Route::apiResource('temporary-cart', TemporaryCartController::class)
            ->only(['index', 'store', 'show', 'update', 'destroy'])
            ->parameters(['temporary-cart' => 'temporaryCart'])
            ->middleware('auth.token');
        Route::get('cart-delete-all', [TemporaryCartController::class, 'deleteAll'])->middleware('auth.token');

        Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'show']);
        Route::post('orders/get-transaction-id', [OrderController::class, 'getTransactionId']);

        Route::apiResource('payment-history', UserPaymentsHistoryController::class)
            ->only(['index', 'store'])
            ->middleware('auth.token');

        Route::prefix('iute-credit')->group(function () {
            Route::get('periods', [IuteCreditController::class, 'periods']);
            Route::post('validate-iban', [IuteCreditController::class, 'validateIban']);
            Route::post('callback', [IuteCreditController::class, 'callback']);
        });

        Route::get('credit', [CreditController::class, 'index']);

        Route::prefix('easy-credit')->group(function () {
            Route::get('offers', [EasyCreditController::class, 'offers']);
            Route::post('installment-calc', [EasyCreditController::class, 'installmentCalc']);
        });

        Route::post('discount-card/calculate', DiscountCardCalculateController::class)->middleware('auth.token');
    });

    Route::post('api-1c/v3/product-of-the-day', [ProductController::class, 'productOfTheDay']);
    Route::post('wp-json/wc/v3/product-of-the-day', [ProductController::class, 'productOfTheDay']);
    Route::get('get_slugs', [ProductController::class, 'getSlugs']);

    Route::get('api-1c/v3/orders', [OrdersExportController::class, 'index']);
    Route::get('api-1c/v3/orders/{order}', [OrdersExportController::class, 'show']);
    Route::get('wp-json/wc/v3/orders', [OrdersExportController::class, 'index']);
    Route::get('wp-json/wc/v3/orders/{order}', [OrdersExportController::class, 'show']);
    Route::get('wp-json/wc/users', [UsersFor1cController::class, 'index']);
    Route::get('wp-json/wc/v3/users', [UsersFor1cController::class, 'index']);
    Route::post('wp-json/wc/v3/users/{userProfile}', [UsersFor1cController::class, 'update']);

    Route::post('check-promo-code', [OrdersActionsController::class, 'checkPromoCode']);
    Route::post('payment_notification', [OrdersActionsController::class, 'paymentNotification']);
    Route::post('payment-confirmation', [OrdersActionsController::class, 'paymentConfirmation']);
    Route::post('payment-return', [OrdersActionsController::class, 'paymentReturn']);
    Route::post('payment-partial-return', [OrdersActionsController::class, 'partialPaymentReturn']);
    Route::post('get_trans_id', [OrdersActionsController::class, 'getTransId']);
    Route::get('get-order', [OrdersActionsController::class, 'getOrder']);
    Route::get('get_unread_counter', [OrdersActionsController::class, 'getUnreadCounter']);

    Route::middleware('web')->group(function () {
        Route::get('attribute-value-autocomplete', [AutocompleteController::class, 'attributeValues']);
        Route::get('attribute-name-autocomplete', [AutocompleteController::class, 'attributeNames']);
        Route::get('accessory-autocomplete', [AutocompleteController::class, 'accessories']);
    });
};

Route::middleware('locale')->group($registerRoutes);
Route::prefix('{locale}')
    ->whereIn('locale', ['ro', 'ru'])
    ->middleware('locale')
    ->name('localized.')
    ->group($registerRoutes);
