// -*- Typescript -*-

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

                widget1.map.add_triangle({position: [0, 0, 0], size: 1, fill_color: "transparent", outline_color: "orange"});
                widget1.map.add_arrow({position: [[0, 0, 0], [1.0, 0, 0]], width: 10, color: "orange"});

                //var me1 = widget1.map.add_circle({position: [0, 0, 0], size: 0.2, fill_color: "red", outline_color: "blue", outline_width: 3});
                var me1 = widget1.map.add_circle({position: [-1, -1, 0], size: 1, fill_color: "#FF8080", outline_color: "blue", outline_width: 3});
                widget1.map.add_arrow({position: [[-1, 0, 0], [-1.5, -1, 0]], width: 1, arrow_length: 2, color: "black"});
                widget1.map.add_arrow({position: [[-0.5, 0, 0], [1, -1, 0]], width: 1, arrow_length: 4, color: "green"});

                var me2 = widget1.map.add_box({position: [0.5, -0.5, 0], size: 2, fill_color: "green", outline_color: "pink", outline_width: 10});
                widget1.map.add_arrow({position: [[0, 0, 0], [0.5, -0.5, 0]], width: 1, color: "darkred"});

                // var me3 = widget1.map.add_triangle({position: [0.1, -0.7, 0], size: 0.1, fill_color: "lightblue"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [-1, -1, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [0.1, -2, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [0.14, -2, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [0.06, -2, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [-2, -0.7, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [ 2, -0.7, 0]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.1, -0.7, 0], [0.1, 2, 0]], width: 1, color: "darkred"});

                widget1.map.add_line({position: [[1, -0.5, 0], [2, -0.5, 0]], width: 10, color: "yellow"});
                widget1.map.add_line({position: [[1, -0.5, 0], [2, 0.5, 0]], width: 10, color: "yellow"});

                // // widget1.map.add_arrow({position: [[0.5, -0.5, 0], [0.8, -0.6]], width: 1, color: "darkred"});
                // // widget1.map.add_arrow({position: [[0.5, -0.5, 0], [0.1, -0.6]], width: 1, color: "brown"});
                // // widget1.map.add_arrow({position: [[0.5, -0.5, 0], [0.8, -0.3]], width: 1, color: "darkgreen"});
                // // widget1.map.add_arrow({position: [[0.5, -0.5, 0], [0.1, -0.3]], width: 10, color: "darkred"});

                widget1.map.viewer.viewport({cx: 0, cy: 0, size: 5});

                widget1.map.on("hover:amv", function (data :THREE.Object3D[]) {
                    console.log('Hover', JSON.stringify(data.map(function(e :THREE.Object3D) { return e.id; })));
                });

                console.log('viewport', widget1.map.viewer.viewport());
                // console.log('me2 pos:', widget1.map.find_map_element(me2).position);
            });
        });
    }
}

// ----------------------------------------------------------------------
