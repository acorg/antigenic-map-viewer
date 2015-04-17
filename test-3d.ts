/// <reference path="build/jquery" />
/// <reference path="build/require" />

"use strict";

import AcmacsPlotData = require("acmacs-plot-data");
import Amv2 = require("amv-level2");

// ----------------------------------------------------------------------

export class Application
{
    constructor() {
    }

    public run() :void {
        require(["css!test", "json!test-3d.json", "acmacs-toolkit", "acmacs-plot-data", "amv-utils", "amv-level2"], (_css :any, test_data_3d :AcmacsPlotData.PlotDataInterface) => {
            console.log('amv-test', new Date());
            $('body').append('<div class="amv-test-widget-wrapper" />');

            var widget = new Amv2.MapWidgetLevel2($('body').find('div'), 500);
            widget.plot_data(new AcmacsPlotData.PlotData(test_data_3d));
            // $.when(widget.hover_stream()).then(function (stream) { stream.onValue(function(elts) { show_point_info('#blue > pre', test_data_3d, elts); }); });
            // $.when(widget.hover_stream()).then(function (stream) { stream.onValue(function(elts) { console.log(elts); }); });
        });
    }
}

// ----------------------------------------------------------------------
