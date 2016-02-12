var jquery = require('jquery');
window.$ = jquery;
window.jQuery = jquery;

$(document).ready(function() {
  const print = ms => {
    console.log(ms);
  };
  print('text');
});

$(document).ready(function() {
  var menuToggle = $('#js-mobile-menu').unbind();
  $('#js-navigation-menu').removeClass('show');

  menuToggle.on('click', function(e) {
    e.preventDefault();
    $('#js-navigation-menu').slideToggle(function() {
      if ($('#js-navigation-menu').is(':hidden')) {
        $('#js-navigation-menu').removeAttr('style');
      }
    });
  });
});

