/// <reference path="build/jquery" />
/// <reference path="build/require" />

/// <reference path="antigenic-map-viewer.d.ts" />

"use strict";

// ----------------------------------------------------------------------

export class Application
{
    constructor() {
    }

    public run() :void {
        require(["json!test-3d.json", "amv-level2", "css!test", "acmacs-toolkit", "acmacs-plot-data", "amv-utils"], (test_data_2d :AntigenicMapViewer.PlotDataInterface, amv :AntigenicMapViewer.MapWidgetLevel2Maker) => {
            console.log('amv-test 2d', new Date());

            // make layout 2d
            test_data_2d.layout = test_data_2d.layout.map((c) => [c[0], c[1]]);

            var test_data_2dX = {"layout":[[-1, 0], [1, 0], [0, 2], [0, -1]], "point_info":[{label: "C"}, {label: "B"}, {label: "CC"}, {label: "T"}],
                            styles: {points: [0, 1, 2, 3],
                                     styles: [{shape: "circle", size: 1.0, outline_color: "#000", fill_color: "#F00", aspect: 0.75, rotation: 0.5},
                                              {shape: "box", size: 1.0, outline_color: "#000", fill_color: "#AAF", aspect: 1 / 0.75},
                                              {shape: "circle", size: 1.0, outline_color: "#000", fill_color: "transparent", aspect: 0.75, rotation: 1.5},
                                              {shape: "triangle", size: 2.0, outline_color: "#000", fill_color: "#0F0"},
                                             ]},
                            title: {"0": {text: ["2D map"]}}};


            var widget1 = amv.make_widget($('body'), null, test_data_2d);
            // var widget2 = amv.make_widget($('body'), null, test_data_2d);
        });
    }
}

// ----------------------------------------------------------------------
