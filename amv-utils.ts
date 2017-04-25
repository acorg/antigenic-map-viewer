/// <reference path="external/requirejs" />
/// <reference path="external/jquery" />

"use strict";

// ----------------------------------------------------------------------

export function require_deferred(modules :string[]) :JQueryPromise<any> {
    var deferred :JQueryDeferred<any> = $.Deferred();
    require(modules, function () {
        deferred.resolve.apply(deferred, arguments);
    });
    return deferred.promise();
}

// ----------------------------------------------------------------------
