"use strict";

import TypingsReferences = require("build/typings-references");

// to auto-compile modules
import Amv2 = require("amv-level2");

// ----------------------------------------------------------------------

export function start() :JQueryPromise<any>
{
    var deferred :JQueryDeferred<any> = $.Deferred();
    require(["three", "jquery-mousewheel", "jquery-ui", "css!jquery-ui"], function () {
        require(["amv-level2", "amv-level1", "css!test"], function () {
            deferred.resolve.apply(deferred, arguments);
        });
    });
    return deferred.promise();
}

// ----------------------------------------------------------------------

export function require_deferred(modules :string[]) :JQueryPromise<any> {
    var deferred :JQueryDeferred<any> = $.Deferred();
    require(modules, function () {
        deferred.resolve.apply(deferred, arguments);
    });
    return deferred.promise();
}

// ----------------------------------------------------------------------
