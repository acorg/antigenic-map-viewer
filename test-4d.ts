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
            var widget1 = new amv2.MapWidgetLevel2($('body'));
            widget1.title(["joap"]);
        });
    }
}

// ----------------------------------------------------------------------
