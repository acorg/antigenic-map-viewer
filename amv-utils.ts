"use strict";

import TypingsReferences = require("build/typings-references");

// ----------------------------------------------------------------------

export function require_deferred(modules :string[]) :JQueryPromise<any> {
    var deferred :JQueryDeferred<any> = $.Deferred();
    require(modules, function () {
        deferred.resolve.apply(deferred, arguments);
    });
    return deferred.promise();
}

// ----------------------------------------------------------------------
