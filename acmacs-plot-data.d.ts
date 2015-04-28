// Type definitions for acmacs-plot-data module

interface PlotDataInterface
{
    diameter :number[];
    layout :PlotDataLayout;
    number_of_antigens :number;
    point_info :Object[];
    styles :PlotDataStyles;
}

declare type PlotDataLayout = number[][];

interface PlotDataStyles
{
    drawing_order :number[][];
    points :number[];
    styles :PlotDataStyle[];
}

interface PlotDataStyle
{
    aspect :number;
    fill_color :string|any[];
    outline_color :string|any[];
    rotation :number;
    shape :string;
    size :number;
    shown :Boolean;
}

// ----------------------------------------------------------------------

declare class PlotData
{
    constructor(plot_data :PlotDataInterface);
}

// ----------------------------------------------------------------------
