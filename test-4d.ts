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
                var me1 = widget1.map.add_circle({position: [0, 0, 0], size: 1, fill_color: "red", outline_color: "blue", outline_width: 3});
                var me2 = widget1.map.add_box({position: [0.5, -0.5, 0], size: 0.3, fill_color: "green", outline_color: "pink", outline_width: 10});
                var me3 = widget1.map.add_triangle({position: [0.7, -0.7, 0], size: 0.1, fill_color: "lightblue"});
                widget1.map.add_line({position: [[0.1, -0.5, 0], [0.8, -0.1]], width: 10, color: "darkred"});
                console.log('me2 pos:', widget1.map.find_map_element(me2).position);
            });
        });
    }
}

// ----------------------------------------------------------------------
