$(document).ready(function () {
  // Function to load collections via AJAX
  function loadCollection(collectionUrl) {
    $.ajax({
      type: 'GET',
      url: collectionUrl +'?view=ajax',
      success: function (data) {
        // Update the content container with the loaded collection content
        $('#collection-container').html(data);
      },
      error: function (error) {
        console.error('Error loading collection:', error);
      },
    });
  }

  function changeUrl(collectionUrl){          
    const url = new URL(window.location.origin + collectionUrl);
    history.pushState({}, "", url);
  }

  function assignActiveLinkStyles(){
    // for desktop 
    $('.collection-link').each(
     function (){
        var collectionUrl = $(this).data('collection-url');

        if(location == window.location.origin + collectionUrl) {
           $(this).parent().addClass('active-collection-type')
        }
     }
    )

    // for mobile 
    $('#select-mobile-filters option').each(function() {
      var collectionUrl = $(this).val();
      if(location == window.location.origin + collectionUrl) {
         $('#select-mobile-filters').val(collectionUrl).change()
      } 
  })
  }

  assignActiveLinkStyles()

  // Attach click event handlers to collection links or buttons
  $('.collection-link').on('click', function (event) {
    event.preventDefault();
    $('.active-collection-type').removeClass('active-collection-type')
    $(this).parent().addClass('active-collection-type')
    var collectionUrl = $(this).data('collection-url');
    
    changeUrl(collectionUrl)
    loadCollection(collectionUrl);
  });


  $('#select-mobile-filters').on('change', function() {
    var collectionUrl = $(this).val();
    changeUrl(collectionUrl)
    loadCollection(collectionUrl);
  });


});

