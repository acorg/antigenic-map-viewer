"use strict";

import TypingsReferences = require("build/typings-references");
/// <reference path='amv-level2.ts' />

// to auto-compile modules
import Amv = require("amv");

// ----------------------------------------------------------------------

export class Application
{
    public run() :void {
        console.log('=========== amv-test 4d ========== ' + new Date() + " ===========");
        $.when(Amv.start()).then(function (amv2: any) {
            var widget1 = new amv2.MapWidgetLevel2($('body'), null, 2);
            $.when(widget1.initialization_completed).then(function () {
                widget1.title(["TITLE-TITLE"]);
                widget1.map.add_circle([0, 0, 0], 1, "red", "blue", 3, 1, 0);
                widget1.map.add_circle([0.5, -0.5, 0], 0.3, "green", "pink", 3, 1, 0);
            });
        });
    }
}

// ----------------------------------------------------------------------
