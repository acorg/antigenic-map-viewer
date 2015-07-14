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
        //var json_file = "test-3d.json";
        // var json_file = "../test-2d-67.json";
        // require([`json!${json_file}`, "amv-level2", "css!test", "acmacs-toolkit", "acmacs-plot-data", "amv-utils"], (test_data_2d :AntigenicMapViewer.PlotDataInterface, amv :AntigenicMapViewer.MapWidget) => {
        require(["amv-level2", "css!test", "acmacs-toolkit", "acmacs-plot-data", "amv-utils"], (amv :AntigenicMapViewer.MapWidget) => {
            console.log('amv-test 2d', new Date());

            // make layout 2d
            // test_data_2d.layout = test_data_2d.layout.map((c) => [c[0], c[1]]);

            var test_data_2d_x = {
                version: 1,
                layout:[[-1, 0], [-0.5, 0], [1, 0], [0.6, 0.2], [0.6, 1.2], [0, 0.5], [0, -1]],
                "point_info":[{"date": "2012-04-15", "location": {"continent": "NORTH-AMERICA", "country": "UNITED STATES OF AMERICA", "latitude": "30.31", "longitude": "-97.75", "name": "TEXAS", "cdc_abbreviation": "TX"}, "name": {"host": "HUMAN", "isolation_number": "50", "location": "TEXAS", "virus_type": "A(H3N2)", "year": "2012"}, "passage": "E5 (2013-09-02)"},
                              {"date": "2015-03-02", "location": {"cdc_abbreviation": "MD", "continent": "NORTH-AMERICA", "country": "UNITED STATES OF AMERICA", "latitude": "38.97", "longitude": "-76.5"}, "name": {"cdc_abbreviation": "MD", "name": "A15026936"}, "passage": "MDCK?/SIAT2 (2015-05-26)"},
                              {label: "C"}, {label: "D"}, {label: "E"}, {label: "F"}, {label: "G"}],
                styles: {
                    points: [0, 1, 2, 3, 4, 5, 6],
                    styles: [{shape: "circle", size: 15.0, outline_color: "#000", fill_color: "#F00", outline_width: 5},
                             {shape: "circle", size: 15.0, outline_color: "#000", fill_color: "#FA0", aspect: 0.75, rotation: Math.PI / 4, outline_width: 1},
                             {shape: "box", size: 10.0, outline_color: "#F00", fill_color: "#AAF", aspect: 1 / 0.75, rotation: 0.5, outline_width: 5},
                             {shape: "box", size: 10.0, outline_color: "#0F0", fill_color: "#AFA", aspect: 1 / 0.75, outline_width: 1},
                             {shape: "box", size: 20.0, outline_color: "#000", fill_color: "#AAF", aspect: 1, outline_width: 1},
                             {shape: "circle", size: 10.0, outline_color: "#000", fill_color: "transparent", aspect: 0.75, rotation: 1.5, outline_width: 1},
                             {shape: "triangle", size: 8.0, outline_color: "#000", fill_color: "#0F0", outline_width: 55},
                            ],
                    drawing_order: [[6], [5], [3], [2], [1], [0], [4]]
                },
                // title: {"0": {text: ["2D map"]}}};
                title: {"0": {text: <string[]>[]}},
                transformation: <[[number, number], [number, number]]>[[0.3, 0.5], [0.5, 0.3]]
            };


            var widget1 = amv.make_widget($('body'), null, test_data_2d_x);
            // var widget2 = amv.make_widget($('body'), null, test_data_2d);
        });
    }
}

// ----------------------------------------------------------------------
