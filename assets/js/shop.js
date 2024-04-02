(function ($) {
    'use strict';

    /*Product Details*/
    var productDetails = function () {
        var $productImageSlider = $('.product-image-slider');
        var $thumbnailSlider = $('.slider-nav-thumbnails');

        var numImages = $thumbnailSlider.find('.thumbnail').length; // Get the number of images

        $productImageSlider.slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            fade: false,
            asNavFor: '.slider-nav-thumbnails',
        });

        $thumbnailSlider.slick({
            slidesToShow: numImages, 
            slidesToScroll: 1,
            asNavFor: '.product-image-slider',
            dots: false,
            focusOnSelect: true,
            prevArrow: '<button type="button" class="slick-prev"><i class="fi-rs-angle-left"></i></button>',
            nextArrow: '<button type="button" class="slick-next"><i class="fi-rs-angle-right"></i></button>'
        });

        // On thumbnail click, go to respective slide in product-image-slider
        $thumbnailSlider.on('click', '.slick-slide', function () {
            var index = $(this).data('slick-index');
            $productImageSlider.slick('slickGoTo', index);
            $thumbnailSlider.slick('slickGoTo', index); 
        });

       // On product-image-slider click, go to respective slide in thumbnailSlider
        $productImageSlider.on('click', '.slick-slide', function () {
            var index = $(this).data('slick-index');
            $thumbnailSlider.slick('slickGoTo', index);
            $productImageSlider.slick('slickGoTo', index); 
        });
  
        // Elevate Zoom
        $('.product-image-slider').on('beforeChange', function (event, slick, currentSlide, nextSlide) {
            var img = $(slick.$slides[nextSlide]).find("img");
            $('.zoomWindowContainer,.zoomContainer').remove();
          
            $(img).elevateZoom({
                zoomType: "inner", 
                cursor: "crosshair",
                zoomWindowFadeIn: 950,
                zoomWindowFadeOut: 950,
            });
            
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
        
    
    };
    /* WOW active */
    new WOW().init();

    // Load functions
    $(document).ready(function () {
        productDetails();
    });

})(jQuery);
