document.addEventListener("DOMContentLoaded", function() {
  const stockists = document.querySelector('.stockists-page');
  const community = document.querySelector('.community-page');
  const ingredients = document.querySelector('.our-ingredients');
  const contact = document.querySelector('.contact-page');
  const mainBlog = document.querySelector('.main-blog');
  const ourStory = document.querySelector('.our-story');
  const subscription = document.querySelector('.subscription-content');
  
  if(stockists || community || ingredients || contact || mainBlog || ourStory || subscription) {
    const header = document.querySelector('header');
    header.setAttribute("style", "position:absolute;top:0;bottom:0;left:0;right:0");
  }


  let pages = document.querySelectorAll('.page')
  let checkHash = location.hash ? location.hash : '#ourIngredients';
  let buttons = document.querySelectorAll('.our-buttons a span');
  console.log(buttons)
  const nav = () => {
      checkHash = location.hash ? location.hash : '#ourIngredients';
      
      for(let el of pages) {
          if('#'+el.id == checkHash) {
              el.style.display = 'block'
          } else {
              el.style.display = 'none'
          }
      }

      for(let i of buttons) {
        if(i.dataset.hash == checkHash) {
              i.setAttribute("style", "background-color:black;color:white");
          } else {
              i.setAttribute("style", "background-color:white;color:black;border:1px solid black;");
          }
      }
  }

  nav();
  window.addEventListener('hashchange', nav);
});

$('.load-more-blog').on('click', function(){
    var $this = $(this),
    totalPages = parseInt($('[data-all-pages]').val()),
    currentPage = parseInt($('[data-this-page]').val()),
    datacollurl = $('[data-coll-url]').val();;

    $this.attr('disabled', true);
    $this.find('[load-more-text]').addClass('hide');

    var nextUrl = $('[data-next-link]').val();
    var current_page_new = currentPage + 1;
    var next_coll = currentPage + 2;

    $.ajax({
        url: nextUrl,
        type: 'GET',
        dataType: 'html',
        success: function(responseHTML){
          console.log(responseHTML)
            $('[data-next-link]').val(datacollurl + "?page="+next_coll);
            $('[data-this-page]').val(current_page_new);
            $('.blog-list').append($(responseHTML).find('.blog-list').html());
        },

        complete: function() {
            if(current_page_new < totalPages) {
                $this.attr('disabled', false); $this.find('[load-more-text]').removeClass('hide'); 
            } 
            if(current_page_new >= totalPages) {
                $this.addClass('hide');
            } 
        }
    })
});

$(document).ready(function() { 


  /* Brand Page */
    $('.blocks-logos').each(function () {
  var $logosContainer = $(this);
  var $logos = $logosContainer.find('.brand-logo').get();

  $logos.sort(function (a, b) {
    var nameA = $(a).find('a').text().trim().toLowerCase();
    var nameB = $(b).find('a').text().trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  $.each($logos, function (i, logo) {
    $logosContainer.append(logo);
  });
});
  /* Brand Page */

  
  var points = document.querySelectorAll('.timeline-point');
    var cards = document.querySelectorAll('.timeline-card');
    var fill = document.querySelector('.progress-fill');
  if($('.timeline-point').length > 0){
    points.forEach(function (point, index) {
      point.addEventListener('click', function () {
        points.forEach(p => p.classList.remove('active'));
        cards.forEach(c => c.classList.remove('active'));

        point.classList.add('active');
        const selectedCard = document.querySelector('.timeline-card[data-year="' + point.dataset.year + '"]');
        selectedCard.classList.add('active');

        var percent = (index / (points.length - 1)) * 100;
        fill.style.width = percent + '%';

        // Right-layer stacking effect
        cards.forEach((card, i) => {
          const offset = (i - index) * 40; // 40px shift per layer
          card.style.transform = `translateX(${offset}px) scale(${i === index ? 1 : 0.95})`;
          card.style.opacity = i === index ? '1' : '0';
          card.style.zIndex = i === index ? '10' : '5';
        });
      });
    });

    // Trigger the initial layout for the first card
    points[0].click();
  }

  if($('.feature-text-columns').length > 0){
  
 let counted = false; // Prevent multiple triggers

    function isScrolledIntoView(elem) {
        let elementTop = $(elem).offset().top;
        let elementBottom = elementTop + $(elem).outerHeight();
        let viewportTop = $(window).scrollTop();
        let viewportBottom = viewportTop + $(window).height();
        return elementBottom > viewportTop && elementTop < viewportBottom;
    }

    function parseNumber(value) {
        let number = parseFloat(value.replace(/[^0-9.]/g, '')); // Extract numeric part
        let suffix = value.replace(/[0-9.]/g, ''); // Extract non-numeric part (e.g., "M+")

        // Convert shorthand (M, K, B) to actual numbers
        if (value.includes("M")) number *= 1;
        if (value.includes("K")) number *= 1;
        if (value.includes("B")) number *= 1;

        return { number, suffix };
    }

    function animateCounter(element, endValue, duration, suffix) {
        $({ countNum: 0 }).animate({ countNum: endValue }, {
            duration: duration,
            easing: 'swing',
            step: function () {
                let displayValue = Math.floor(this.countNum);
                if (suffix.includes("M")) displayValue = (this.countNum / 1).toFixed(1) + "M";
                if (suffix.includes("K")) displayValue = '$' +(this.countNum / 1).toFixed(1) + "K";
                if (suffix.includes("B")) displayValue = (this.countNum / 1).toFixed(1) + "B";
                if (suffix.includes("%")) displayValue = displayValue + "%";
                $(element).text((suffix.includes("$") ? "" : "") + displayValue + (suffix.includes("+") ? "+" : ""));
            },
            complete: function () {
           
                $(element).text(sign + endValue + suffix); // Ensure it stops at final value
            }
        });
    }

    $(window).on("scroll", function () {
        if (!counted && isScrolledIntoView(".feature-text-columns")) {
            counted = true; // Run only once

            $(".counter").each(function () {
                let rawValue = $(this).attr("data-count");
                let { number, suffix } = parseNumber(rawValue);
                animateCounter($(this), number, 2000, suffix);
            });
        }
    });
  }
  $('.logolist').slick({
 speed: 8000,
    autoplay: true,
    autoplaySpeed: 0,
    centerMode: false,
    cssEase: 'linear',
    slidesToShow: 1,
    draggable:false,
    focusOnSelect:false,
    pauseOnFocus:false,
    pauseOnHover:false,
    slidesToScroll: 1,
    variableWidth: true,
    infinite: true,
    initialSlide: 1,
    arrows: false,
    buttons: false,
  responsive: [
    {
      breakpoint: 1024,
      settings: {
        slidesToShow: 4,
        slidesToScroll: 4,
        infinite: true,
        dots: true
      }
    },
    {
      breakpoint: 600,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 2
      }
    },
    {
      breakpoint: 480,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1
      }
    }
  ]
  });
  setTimeout(function() {
    if ($( window ).width() <= 450) {
      $('.relatedArticles').slick({
       infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        dots: true,
        arrows: false
      });
    }
  }, 1000)

});