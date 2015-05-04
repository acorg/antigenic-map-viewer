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

            var widget1 = amv.make_widget($('body'), null, test_data_2d);
            // var widget2 = amv.make_widget($('body'), null, test_data_2d);
        });
    }
}

// ----------------------------------------------------------------------
