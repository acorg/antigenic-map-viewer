require.config({
    paths: {
        'jquery': 'jquery',
        'jquery-ui': 'jquery-ui',
        'jquery-mousewheel': 'jquery.mousewheel',
        'three':  'three',
        'css': '',
        'json': '',
        'text': ''
    }
});

// Chrome (40) requires loading libraries one by one, otherwise bacon does not add its function to $
require(["jquery", "three"], function() {
    require(["jquery-mousewheel", "jquery-ui", "css!jquery-ui"], function () {
        require([AMV_MAIN], function(main) { (new main.Application()).run(); });
    });
});
