(function ($) {
    'use strict';

    // Reusable function to initialize a slider for a given gallery container
    function initSlickSlider($gallery) {
        var $productImageSlider = $gallery.find('.product-image-slider');
        var $thumbnailSlider = $gallery.find('.slider-nav-thumbnails');
        var numImages = $thumbnailSlider.find('.thumbnail').length;


        // If already initialized (important for dynamic content), destroy first
        if ($productImageSlider.hasClass('slick-initialized')) {
            $productImageSlider.slick('unslick');
        }
        if ($thumbnailSlider.hasClass('slick-initialized')) {
            $thumbnailSlider.slick('unslick');
        }

        $productImageSlider.slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            fade: false,
            asNavFor: $thumbnailSlider,
            infinite: false
        });

        $thumbnailSlider.slick({
            slidesToShow: numImages,
            slidesToScroll: 1,
            asNavFor: $productImageSlider,
            dots: false,
            focusOnSelect: true,
            infinite: false
        });

        // Refresh the sliders on window resize if needed
        $(window).on('resize', function () {
            setTimeout(() => {
                $productImageSlider.slick('refresh');
                $thumbnailSlider.slick('refresh');
            }, 300);
        });
    }

    // Expose the function globally so it can be used in modal script
    window.initSlickSlider = initSlickSlider;

    // Initialize sliders on all product detail galleries on page load
    $(document).ready(function () {
        $('.detail-gallery').each(function () {
            initSlickSlider($(this));
        });
    });

    // ElevateZoom on image hover for zoom functionality
    $(document).on('mouseenter touchstart click', '.product-image-slider img', function (e) {
        // Remove previous zoom containers (if any)
        $('.zoomWindowContainer, .zoomContainer').remove();

        // Check if the image is inside the modal
        let inModal = $(this).closest('#quickViewModal').length > 0;
        // Use inner zoom if inside modal or on small devices
        let useInnerZoom = inModal || window.innerWidth < 780;

        let zoomOptions = {
            zoomType: useInnerZoom ? "inner" : "window",
            scrollZoom: true
        };

        // Add extra options only if not using inner zoom
        if (!useInnerZoom) {
            zoomOptions.zoomWindowWidth = 650;
            zoomOptions.zoomWindowHeight = 650;
            zoomOptions.borderSize = 2;
            zoomOptions.zoomWindowFadeIn = 500;
            zoomOptions.zoomWindowFadeOut = 500;
            zoomOptions.zoomLevel = 0.5;
        }

        // Initialize elevateZoom with the computed options
        $(this).elevateZoom(zoomOptions);

        if (!useInnerZoom) {
            setTimeout(() => {
                $('.zoomWindow').css({
                    'border-radius': '25px',
                    'border-color': '#64ccb9',
                    'margin-left': '20px'
                });
            }, 100);
        }
    });


    // Filter color/Size
    $('.list-filter').each(function () {
        $(this).find('a').on('click', function (event) {
            event.preventDefault();
            $(this).parent().siblings().removeClass('active');
            $(this).parent().toggleClass('active');
            $(this).parents('.attr-detail').find('.current-size').text($(this).text());
            $(this).parents('.attr-detail').find('.current-color').text($(this).attr('data-color'));
        });
    });

    // Qty Up-Down
    $('.detail-qty').each(function () {
        var qtyval = parseInt($(this).find('.qty-val').text(), 10);
        $('.qty-up').on('click', function (event) {
            event.preventDefault();
            qtyval = qtyval + 1;
            $(this).prev().text(qtyval);
        });
        $('.qty-down').on('click', function (event) {
            event.preventDefault();
            qtyval = qtyval - 1;
            if (qtyval > 1) {
                $(this).next().text(qtyval);
            } else {
                qtyval = 1;
                $(this).next().text(qtyval);
            }
        });
    });

    // Prevent dropdown menu from closing when clicking on cart_list
    $('.dropdown-menu .cart_list').on('click', function (event) {
        event.stopPropagation();
    });


    /* WOW active */
    new WOW().init();



})(jQuery);
