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
            console.log('=========== amv-test 2d ========== ', new Date(), "===========");

            // make layout 2d
            // test_data_2d.layout = test_data_2d.layout.map((c) => [c[0], c[1]]);

            // var test_data_2d = this.test_data_2d();
            var test_data_2d = this.test_data_2d_random(100);
            var widget1 = amv.make_widget($('body'), null, test_data_2d);
        });
    }

    private test_data_2d() :any {
        return {
            version: 1,
            layout: [[-1, 0], [-0.5, 0], [1, 0], [0.6, 0.2], [0.6, 1.2], [0, 0.5], [0, -1]],
            "point_info":[{"date": "2012-04-15", "location": {"continent": "NORTH-AMERICA", "country": "UNITED STATES OF AMERICA", "latitude": "30.31", "longitude": "-97.75", "name": "TEXAS", "cdc_abbreviation": "TX"}, "name": {"host": "HUMAN", "isolation_number": "50", "location": "TEXAS", "virus_type": "A(H3N2)", "year": "2012"}, "passage": "E5 (2013-09-02)"},
                          {"date": "2015-03-02", "location": {"cdc_abbreviation": "MD", "continent": "NORTH-AMERICA", "country": "UNITED STATES OF AMERICA", "latitude": "38.97", "longitude": "-76.5"}, "name": {"cdc_abbreviation": "MD", "name": "A15026936"}, "passage": "MDCK?/SIAT2 (2015-05-26)"},
                          {label: "C"}, {label: "D"}, {label: "E"}, {label: "F"}, {label: "G"}],
            styles: {
                points: [0, 1, 2, 3, 4, 5, 6],
                styles: [{shape: "circle", size: 15.0, outline_color: "#000", fill_color: "#F00", outline_width: 5, label_color: "red", label_position_x: 1, label_position_y: 0, label_size: 3},
                         {shape: "circle", size: 15.0, outline_color: "#000", fill_color: "#FA0", aspect: 0.75, rotation: Math.PI / 4, outline_width: 1},
                         {shape: "box", size: 10.0, outline_color: "#F00", fill_color: "#AAF", aspect: 1 / 0.75, rotation: 0.5, outline_width: 5},
                         {shape: "box", size: 10.0, outline_color: "#0F0", fill_color: "#AFA", aspect: 1 / 0.75, outline_width: 1},
                         {shape: "box", size: 20.0, outline_color: "#000", fill_color: "#AAF", aspect: 1, outline_width: 1},
                         {shape: "circle", size: 10.0, outline_color: "#000", fill_color: "transparent", aspect: 1 / 0.75, rotation: Math.PI / 3, outline_width: 1},
                         {shape: "triangle", size: 8.0, outline_color: "#000", fill_color: "#0F0", outline_width: 5},
                        ],
                drawing_order: [[6], [5], [3], [2], [1], [0], [4]]
            },
            // title: {"0": {text: ["2D map"]}}};
            title: {"0": {text: <string[]>[]}},
            transformation: <[[number, number], [number, number]]>[[0.3, 0.5], [0.5, 0.3]]
        };
    }

    private test_data_2d_random(num_points :number) :any {
        var shape_size = 10;
        var layout_range = [0, 5];
        var random_in = function(range: number[]) { return Math.random() * (range[1] - range[0]) + range[0]; }
        var data :AntigenicMapViewer.PlotDataInterface = {
            version: 1,
            layout: [[0, 0]],
            point_info: [{date: "2015-09-08", label: "ZERO"}],
            styles: {
                points: [0],
                styles: [{shape: "circle", size: shape_size, fill_color: "#F00", outline_color: "#000", outline_width: 1, label_color: "black", label_position_x: 1, label_position_y: 0, label_size: 1},
                         {shape: "circle", size: shape_size, fill_color: "#0F0", aspect: 0.75, rotation: Math.PI / 4, outline_color: "#000", outline_width: 1, label_color: "black", label_position_x: 1, label_position_y: 0, label_size: 1},
                         {shape: "box", size: shape_size, outline_color: "#F00", fill_color: "#AAF", aspect: 1 / 0.75, rotation: 0.5, outline_width: 1},
                         {shape: "box", size: shape_size, outline_color: "#0F0", fill_color: "#AFA", aspect: 1 / 0.75, outline_width: 1},
                         {shape: "triangle", size: shape_size, outline_color: "#000", fill_color: "#00F", outline_width: 1},
                        ],
                drawing_order: [[0]]
            },
            // title: {"0": {text: ["2D map"]}}};
            title: {"0": {text: ["random " + num_points]}},
            // transformation: <[[number, number], [number, number]]>[[0.3, 0.5], [0.5, 0.3]]
            transformation: <[[number, number], [number, number]]>[[0, 1], [-1, 0]]
        };
        for (var i = 1; i < num_points; ++i) {
            var coord = [random_in(layout_range), random_in(layout_range)];
            data.layout.push(coord);
            data.point_info.push({label: '[' + coord[0].toFixed(2) + ' ' + coord[1].toFixed(2) + ']'});
            data.styles.points.push(Math.floor(random_in([0, data.styles.styles.length])));
        }
        return data;
    }

}

// ----------------------------------------------------------------------
