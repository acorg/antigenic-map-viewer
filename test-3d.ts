/// <reference path="external/requirejs" />

"use strict";

import * as AntigenicMapViewer from "antigenic-map-viewer";

// ----------------------------------------------------------------------

export class Application
{
    constructor() {
    }

    public run() :void {
        require(["json!test-3d.json", "amv-level2", "css!test", "acmacs-toolkit", "acmacs-plot-data", "amv-utils"], (test_data_3d :AntigenicMapViewer.PlotDataInterface, amv :AntigenicMapViewer.MapWidget) => {
            console.log('amv-test 3d', new Date());

            var widget1 = amv.make_widget($('body'), null, test_data_3d);
            // var widget2 = amv.make_widget($('body'), null, test_data_3d);
        });
    }
}

// ----------------------------------------------------------------------
