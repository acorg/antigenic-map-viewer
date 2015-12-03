"use strict";

import TypingsReferences = require("build/typings-references");

// to auto-compile modules
import Amv2 = require("amv-level2");

// ----------------------------------------------------------------------

export var AllManipulators :AntigenicMapViewer.Manipulators = [
    ["zoom", "wheel:shift:amv"],
    ["rotate", "wheel:ctrl:amv"], // 2d
    ["orbit", "drag::amv"],  // 3d
    ["pan", "drag:shift:amv"],
    ["fliph", "left:alt:amv"],  // 2d
    ["flipv", "left:shift-alt:amv"], // 2d
    ["fov", "wheel:shift-alt:amv"], // 3d
    ["element-scale", "wheel:alt:amv"],
    ["element-hover", "move::amv"],
    ["key", "key::amv"]
];

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
