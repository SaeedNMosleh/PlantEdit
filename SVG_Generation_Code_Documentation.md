# PlantUML SVG Generation Code Documentation

## Overview

This document provides a comprehensive extraction of all the code responsible for SVG generation in PlantUML. The SVG generation system is implemented through a hierarchy of classes that work together to convert diagram objects into SVG markup.

## Guide for LLMs to Interpret PlantUML-Generated SVG

### Overview of PlantUML SVG Structure

PlantUML generates SVG diagrams with a predictable structure that contains semantic information about the underlying diagram. When analyzing these SVGs, focus on these key aspects:

### 1. Element Types and Their Significance

#### Text Elements
- `<text>` elements contain labels, names, and descriptions
- Text position (x, y coordinates) indicates association with nearby shapes
- Font styles (weight, size) often indicate hierarchy or importance

```xml
<text font-family="sans-serif" font-size="14" font-weight="bold" x="150" y="27">Class Name</text>
```

#### Shapes and Their Meaning
- **Rectangles** (`<rect>`) typically represent classes, components, or actors
- **Paths** (`<path>`) often represent relationships, inheritance, or complex shapes
- **Polygons** (`<polygon>`) may represent specialized elements like notes or decision points

#### Groups
- `<g>` elements group related components together
- Nested groups create logical hierarchies of diagram elements

### 2. Relationship Identification

- **Lines/Paths Between Elements**: Represent relationships
- **Arrow Markers**: Determine relationship direction and type
  - Triangle arrowheads often indicate inheritance
  - Open arrowheads often indicate associations
  - Diamond shapes may indicate aggregation/composition

```xml
<path d="M100,200 L300,400" marker-end="url(#arrowhead)" stroke="#A80036" stroke-width="1.0"/>
```

### 3. Color and Style Interpretation

- **Color schemes** are consistent within diagram types:
  - Class diagrams: typically use beige/tan rectangles (#FEFECE)
  - Sequence diagrams: use distinctive colors for lifelines
  - Activity diagrams: may use green for start, red for end states
- **Stroke patterns** (dashed/solid) indicate relationship types
- **Fill colors** differentiate between object types

### 4. Metadata and Custom Attributes

PlantUML adds semantic information through:

- **IDs**: Often encoded with meaning (e.g., `id="class_Customer"`)
- **Custom attributes**: May include `codeLine` attributes that reference original diagram positions
- **Title and description** elements contain high-level diagram information

### 5. Analysis Strategy

1. **Start with document-level metadata** (title, viewBox dimensions)
2. **Identify primary elements** (classes, actors, components)
3. **Map relationships** between elements by analyzing paths and connectors
4. **Extract text labels** associated with elements and relationships
5. **Consider grouping** to understand component hierarchies

### 6. Special Features

#### Interactive Elements
- Look for JavaScript inclusions and `onclick` attributes
- Hover effects may be implemented through CSS classes

#### Embedded Images
- May contain base64-encoded images for icons or custom elements
- These enrich the diagram but are usually decorative

#### Shadows and Effects
- Filter effects typically enhance visual appearance but don't add semantic value

### 7. Common Diagram Types and Their SVG Patterns

#### Class Diagrams
- Rectangles with compartments (sections divided by horizontal lines)
- Text elements organized in these compartments represent attributes and methods
- Lines with various arrow markers represent class relationships

#### Sequence Diagrams
- Vertical lines (lifelines) represent participants
- Horizontal arrows represent messages
- Rectangles on lifelines represent activation periods

#### Activity/State Diagrams
- Rounded rectangles for activities/states
- Diamond shapes for decision points
- Arrows showing flow direction

### 8. Extracting Hierarchical Information

To reconstruct the logical structure:
1. Group elements by spatial proximity
2. Identify parent-child relationships through containment
3. Use arrows to determine dependencies and interactions

By understanding these patterns, an LLM can effectively parse and interpret PlantUML-generated SVGs to extract the underlying diagram structure and meaning, allowing for accurate analysis and description of the diagram's content.

## Core Architecture

### 1. Main Classes

#### SvgGraphics Class
The primary class responsible for generating SVG content. It handles:
- Document creation and DOM manipulation
- Drawing primitives (rectangles, lines, paths, etc.)
- Style and attribute management
- Final XML output generation

**Location**: `src/net/sourceforge/plantuml/klimt/drawing/svg/SvgGraphics.java`

```java
public class SvgGraphics {
    final private Document document;
    final private Element root;
    final private Element defs;
    final private Element gRoot;
    
    private String fill = "black";
    private String stroke = "black";
    private String strokeWidth;
    private String strokeDasharray = null;
    
    public SvgGraphics(long seed, SvgOption option) {
        // Initialize DOM document
        this.document = getDocument();
        this.option = option;
        this.root = getRootNode();
        
        // Create SVG structure
        defs = simpleElement("defs");
        gRoot = simpleElement("g");
        
        // Set up filters and IDs
        this.filterUid = "b" + getSeed(seed);
        this.shadowId = "f" + getSeed(seed);
        this.gradientId = "g" + getSeed(seed);
        
        // Handle interactive features
        if (option.isInteractive()) {
            final Element styles = getStylesForInteractiveMode();
            if (styles != null) defs.appendChild(styles);
            
            final Element script = getScriptForInteractiveMode();
            if (script != null) defs.appendChild(script);
        }
        
        // Handle background colors and gradients
        handleBackgroundColor(option.getBackcolor());
    }
}
```

#### UGraphicSvg Class
The graphics abstraction layer that implements the UGraphic interface for SVG output.

**Location**: `src/net/sourceforge/plantuml/klimt/drawing/svg/UGraphicSvg.java`

```java
public class UGraphicSvg extends AbstractUGraphic<SvgGraphics> implements ClipContainer {
    private final boolean textAsPath;
    private SvgOption option;
    
    public static UGraphicSvg build(SvgOption option, boolean textAsPath, long seed, StringBounder stringBounder) {
        final UGraphicSvg result = new UGraphicSvg(stringBounder, textAsPath);
        result.copy(option.getBackcolor(), option.getColorMapper(), new SvgGraphics(seed, option));
        result.option = option;
        return result;
    }
    
    private void register() {
        // Register shape drivers
        registerDriver(URectangle.class, new DriverRectangleSvg(this));
        if (textAsPath)
            registerDriver(UText.class, new DriverTextAsPathSvg(this));
        else
            registerDriver(UText.class, new DriverTextSvg(getStringBounder(), this));
            
        registerDriver(ULine.class, new DriverLineSvg(this));
        registerDriver(UPixel.class, new DriverPixelSvg());
        registerDriver(UPolygon.class, new DriverPolygonSvg(this));
        registerDriver(UEllipse.class, new DriverEllipseSvg(this));
        registerDriver(UImage.class, new DriverImagePng(this));
        registerDriver(UImageSvg.class, new DriverImageSvgSvg());
        registerDriver(UPath.class, new DriverPathSvg(this));
        registerDriver(DotPath.class, new DriverDotPathSvg());
        registerDriver(UCenteredCharacter.class, new DriverCenteredCharacterSvg());
    }
}
```

## SVG Generation Process

### 1. Document Initialization

```java
// From SvgGraphics.java
private Element getRootNode() {
    final Element svg = (Element) document.createElement("svg");
    document.appendChild(svg);
    
    // Set SVG namespace and attributes
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("version", "1.1");
    
    return svg;
}

private Document getDocument() throws ParserConfigurationException {
    final DocumentBuilder builder = XmlFactories.newDocumentBuilder();
    final Document document = builder.newDocument();
    document.setXmlStandalone(true);
    return document;
}
```

### 2. Shape Drawing Methods

#### Rectangle Drawing
```java
public void svgRectangle(double x, double y, double width, double height, double rx, double ry, 
                        double deltaShadow, String id, String codeLine) {
    if (height <= 0 || width <= 0) return;
    
    manageShadow(deltaShadow);
    if (hidden == false) {
        final Element elt = createRectangleInternal(x, y, width, height);
        addFilterShadowId(elt, deltaShadow);
        
        if (rx > 0 && ry > 0) {
            elt.setAttribute("rx", format(rx));
            elt.setAttribute("ry", format(ry));
        }
        
        if (id != null) elt.setAttribute("id", id);
        if (codeLine != null) elt.setAttribute("codeLine", codeLine);
        
        getG().appendChild(elt);
    }
    ensureVisible(x + width + 2 * deltaShadow, y + height + 2 * deltaShadow);
}

private Element createRectangleInternal(double x, double y, double width, double height) {
    final Element elt = (Element) document.createElement("rect");
    elt.setAttribute("x", format(x));
    elt.setAttribute("y", format(y));
    elt.setAttribute("width", format(width));
    elt.setAttribute("height", format(height));
    fillMe(elt);
    elt.setAttribute("style", getStyleSpecial());
    return elt;
}
```

#### Path Drawing
```java
public void svgPath(double x, double y, UPath path, double deltaShadow) {
    manageShadow(deltaShadow);
    ensureVisible(x, y);
    final StringBuilder sb = new StringBuilder();
    
    for (USegment seg : path) {
        final USegmentType type = seg.getSegmentType();
        final double coord[] = seg.getCoord();
        
        if (type == USegmentType.SEG_MOVETO) {
            sb.append("M" + format(coord[0] + x) + "," + format(coord[1] + y) + " ");
            ensureVisible(coord[0] + x + 2 * deltaShadow, coord[1] + y + 2 * deltaShadow);
        } else if (type == USegmentType.SEG_LINETO) {
            sb.append("L" + format(coord[0] + x) + "," + format(coord[1] + y) + " ");
            ensureVisible(coord[0] + x + 2 * deltaShadow, coord[1] + y + 2 * deltaShadow);
        } else if (type == USegmentType.SEG_QUADTO) {
            sb.append("Q" + format(coord[0] + x) + "," + format(coord[1] + y) + " " + 
                     format(coord[2] + x) + "," + format(coord[3] + y) + " ");
            ensureVisible(coord[0] + x + 2 * deltaShadow, coord[1] + y + 2 * deltaShadow);
            ensureVisible(coord[2] + x + 2 * deltaShadow, coord[3] + y + 2 * deltaShadow);
        } else if (type == USegmentType.SEG_CUBICTO) {
            sb.append("C" + format(coord[0] + x) + "," + format(coord[1] + y) + " " + 
                     format(coord[2] + x) + "," + format(coord[3] + y) + " " + 
                     format(coord[4] + x) + "," + format(coord[5] + y) + " ");
            ensureVisible(coord[0] + x + 2 * deltaShadow, coord[1] + y + 2 * deltaShadow);
            ensureVisible(coord[2] + x + 2 * deltaShadow, coord[3] + y + 2 * deltaShadow);
            ensureVisible(coord[4] + x + 2 * deltaShadow, coord[5] + y + 2 * deltaShadow);
        } else if (type == USegmentType.SEG_ARCTO) {
            sb.append("A" + format(coord[0]) + "," + format(coord[1]) + " " + format(coord[2]) + " " +
                     formatBoolean(coord[3]) + " " + formatBoolean(coord[4]) + " " + 
                     format(coord[5] + x) + "," + format(coord[6] + y) + " ");
            ensureVisible(coord[5] + coord[0] + x + 2 * deltaShadow, coord[6] + coord[1] + y + 2 * deltaShadow);
        } else if (type == USegmentType.SEG_CLOSE) {
            // Nothing
        }
    }
    
    if (hidden == false) {
        final Element elt = (Element) document.createElement("path");
        elt.setAttribute("d", sb.toString());
        elt.setAttribute("style", getStyle());
        fillMe(elt);
        
        final String id = path.getComment();
        if (id != null) elt.setAttribute("id", id);
        
        final String codeLine = path.getCodeLine();
        if (codeLine != null) elt.setAttribute("codeLine", codeLine);
        
        addFilterShadowId(elt, deltaShadow);
        getG().appendChild(elt);
    }
}
```

#### Text Drawing
```java
public void text(String text, double x, double y, String fontFamily, int fontSize, String fontWeight,
                String fontStyle, String textDecoration, double textLength, Map<String, String> attributes,
                String textBackColor) {
    if (hidden == false) {
        final Element elt = (Element) document.createElement("text");
        elt.setAttribute("x", format(x));
        elt.setAttribute("y", format(y));
        fillMe(elt);
        elt.setAttribute("font-size", format(fontSize));
        
        // Handle length adjustment
        if (option.getLengthAdjust() == LengthAdjust.SPACING) {
            elt.setAttribute("lengthAdjust", "spacing");
            elt.setAttribute("textLength", format(textLength));
        } else if (option.getLengthAdjust() == LengthAdjust.SPACING_AND_GLYPHS) {
            elt.setAttribute("lengthAdjust", "spacingAndGlyphs");
            elt.setAttribute("textLength", format(textLength));
        }
        
        // Set font properties
        if (fontWeight != null) elt.setAttribute("font-weight", fontWeight);
        if (fontStyle != null) elt.setAttribute("font-style", fontStyle);
        if (textDecoration != null) elt.setAttribute("text-decoration", textDecoration);
        
        if (fontFamily != null) {
            if ("roboto".equalsIgnoreCase(fontFamily)) addRoboto();
            if ("monospaced".equalsIgnoreCase(fontFamily)) fontFamily = "monospace";
            elt.setAttribute("font-family", fontFamily);
            
            // Handle monospace character spacing
            if (fontFamily.equalsIgnoreCase("monospace") || fontFamily.equalsIgnoreCase("courier"))
                text = text.replace(' ', (char) 160);
        }
        
        // Handle text background color
        if (textBackColor != null) {
            final String backFilterId = getFilterBackColor(textBackColor);
            elt.setAttribute("filter", "url(#" + backFilterId + ")");
        }
        
        // Add custom attributes
        for (Map.Entry<String, String> ent : attributes.entrySet())
            elt.setAttribute(ent.getKey(), ent.getValue());
            
        elt.setTextContent(text);
        getG().appendChild(elt);
    }
    ensureVisible(x, y);
    ensureVisible(x + textLength, y);
}
```

### 3. Style and Attribute Management

#### Color and Fill Management
```java
private void fillMe(Element elt) {
    if (fill.equals("#00000000")) return;
    
    if (fill.matches("#[0-9A-Fa-f]{8}")) {
        // Handle RGBA colors by separating RGB and alpha
        elt.setAttribute("fill", fill.substring(0, 7));
        final double opacity = Integer.parseInt(fill.substring(7), 16) / 255.0;
        elt.setAttribute("fill-opacity", String.format(Locale.US, "%1.5f", opacity));
    } else {
        elt.setAttribute("fill", fill);
    }
}

private String getStyle() {
    final StringBuilder style = new StringBuilder();
    style.append("stroke:" + stroke + ";");
    style.append("stroke-width:" + strokeWidth + ";");
    
    if (fill.equals("#00000000")) style.append("fill:none;");
    if (strokeDasharray != null) style.append("stroke-dasharray:" + strokeDasharray + ";");
    
    return style.toString();
}

public final void setFillColor(String fill) {
    this.fill = fixColor(fill);
}

public final void setStrokeColor(String stroke) {
    this.stroke = fixColor(stroke);
}

private String fixColor(String color) {
    return color == null || "#00000000".equals(color) ? "none" : color;
}
```

#### Gradient Support
```java
public String createSvgGradient(String color1, String color2, char policy) {
    final List<Object> key = Arrays.asList((Object) color1, color2, policy);
    String id = gradients.get(key);
    
    if (id == null) {
        final Element elt = (Element) document.createElement("linearGradient");
        
        // Set gradient direction based on policy
        if (policy == '|') {
            elt.setAttribute("x1", "0%");
            elt.setAttribute("y1", "50%");
            elt.setAttribute("x2", "100%");
            elt.setAttribute("y2", "50%");
        } else if (policy == '\\') {
            elt.setAttribute("x1", "0%");
            elt.setAttribute("y1", "100%");
            elt.setAttribute("x2", "100%");
            elt.setAttribute("y2", "0%");
        } else if (policy == '-') {
            elt.setAttribute("x1", "50%");
            elt.setAttribute("y1", "0%");
            elt.setAttribute("x2", "50%");
            elt.setAttribute("y2", "100%");
        } else {
            elt.setAttribute("x1", "0%");
            elt.setAttribute("y1", "0%");
            elt.setAttribute("x2", "100%");
            elt.setAttribute("y2", "100%");
        }
        
        id = gradientId + gradients.size();
        gradients.put(key, id);
        elt.setAttribute("id", id);
        
        // Create gradient stops
        final Element stop1 = (Element) document.createElement("stop");
        stop1.setAttribute("stop-color", color1);
        stop1.setAttribute("offset", "0%");
        
        final Element stop2 = (Element) document.createElement("stop");
        stop2.setAttribute("stop-color", color2);
        stop2.setAttribute("offset", "100%");
        
        elt.appendChild(stop1);
        elt.appendChild(stop2);
        defs.appendChild(elt);
    }
    return id;
}
```

### 4. Interactive Features

#### CSS and JavaScript Integration
```java
private Element getStylesForInteractiveMode() {
    final Element style = simpleElement("style");
    final String text = getData("default.css");
    if (text == null) return null;
    
    final CDATASection cdata = document.createCDATASection(text);
    style.setAttribute("type", "text/css");
    style.appendChild(cdata);
    return style;
}

private Element getScriptForInteractiveMode() {
    final Element script = document.createElement("script");
    final String text = getData("default.js");
    if (text == null) return null;
    
    script.setTextContent(text);
    return script;
}

private static String getData(final String name) {
    try {
        final InputStream is = SvgGraphics.class.getResourceAsStream("/svg/" + name);
        if (is == null) {
            Log.error("Cannot retrieve " + name);
        } else {
            return FileUtils.readText(is);
        }
    } catch (IOException e) {
        Logme.error(e);
    }
    return null;
}
```

### 5. Image Handling

#### PNG Image Embedding
```java
public void svgImage(BufferedImage image, double x, double y) throws IOException {
    final Element elt = document.createElement("image");
    elt.setAttribute("width", format(image.getWidth()));
    elt.setAttribute("height", format(image.getHeight()));
    elt.setAttribute("x", format(x));
    elt.setAttribute("y", format(y));
    
    final String s = toBase64(image);
    elt.setAttribute("xlink:href", "data:image/png;base64," + s);
    
    getG().appendChild(elt);
}

private String toBase64(BufferedImage image) throws IOException {
    final ByteArrayOutputStream baos = new ByteArrayOutputStream();
    SImageIO.write(image, "png", baos);
    final byte[] bytes = baos.toByteArray();
    return Base64Coder.encodeLines(bytes).trim();
}
```

#### SVG Image Embedding
```java
public void svgImage(UImageSvg image, double x, double y) {
    String svg = manageScale(image);
    final String s = toBase64(svg);
    elt.setAttribute("xlink:href", "data:image/svg+xml;base64," + s);
}

private String manageScale(UImageSvg image) {
    final double scale = image.getScale();
    String svg = image.getSvg(false);
    
    if (scale != 1) {
        final String factor = format(scale);
        svg = svg.replaceFirst("(<g\\b[^>]*\\btransform\\s*=\\s*\"[^\"]*?)\"",
                "$1 scale(" + factor + ")\"");
        if (svg.contains("\" scale(" + factor + ")\"") == false) {
            svg = svg.replaceFirst("<g\\b", "<g transform=\"scale(" + factor + ")\"");
        }
    }
    return svg;
}
```

### 6. Shadow and Filter Effects

```java
private void manageShadow(double deltaShadow) {
    if (deltaShadow > 0) withShadow = true;
}

private void addFilterShadowId(final Element elt, double deltaShadow) {
    if (deltaShadow > 0) {
        elt.setAttribute("filter", "url(#" + shadowId + ")");
    }
}

private void createFilterShadow() {
    final Element filter = (Element) document.createElement("filter");
    filter.setAttribute("id", shadowId);
    filter.setAttribute("x", "-1");
    filter.setAttribute("y", "-1");
    filter.setAttribute("width", "300%");
    filter.setAttribute("height", "300%");
    
    addFilter(filter, "feGaussianBlur", "in", "SourceAlpha", "stdDeviation", "2", "result", "blur");
    addFilter(filter, "feOffset", "in", "blur", "dx", "2", "dy", "2", "result", "offsetBlur");
    
    final Element feMerge = (Element) document.createElement("feMerge");
    addMergeNode(feMerge, "offsetBlur");
    addMergeNode(feMerge, "SourceGraphic");
    filter.appendChild(feMerge);
    
    defs.appendChild(filter);
}
```

### 7. Final XML Output

```java
public void createXml(OutputStream os) throws TransformerException, IOException {
    final ByteArrayOutputStream baos = new ByteArrayOutputStream();
    createXmlInternal(baos);
    String s = new String(baos.toByteArray());
    
    // Replace image placeholders with actual base64 data
    for (Map.Entry<String, String> ent : images.entrySet()) {
        final String k = "<" + ent.getKey() + "/>";
        s = s.replace(k, ent.getValue());
    }
    
    s = removeXmlHeader(s);
    os.write(s.getBytes());
}

private void createXmlInternal(OutputStream os) throws TransformerException {
    final DOMSource source = new DOMSource(document);
    
    final int maxXscaled = (int) (maxX * option.getScale());
    final int maxYscaled = (int) (maxY * option.getScale());
    String style = "width:" + maxXscaled + "px;height:" + maxYscaled + "px;";
    
    if (backcolorString != null && "#00000000".equals(backcolorString) == false) {
        style += "background:" + backcolorString + ";";
    }
    
    if (option.getSvgDimensionStyle()) {
        root.setAttribute("style", style);
        root.setAttribute("width", format(maxX) + "px");
        root.setAttribute("height", format(maxY) + "px");
    }
    
    root.setAttribute("viewBox", "0 0 " + maxXscaled + " " + maxYscaled);
    root.setAttribute("zoomAndPan", "magnify");
    root.setAttribute("preserveAspectRatio", option.getPreserveAspectRatio());
    root.setAttribute("contentStyleType", "text/css");
    
    if (pendingBackground != null) {
        pendingBackground.setAttribute("width", format(maxX));
        pendingBackground.setAttribute("height", format(maxY));
    }
    
    final StreamResult scrResult = new StreamResult(os);
    getTransformer().transform(source, scrResult);
}
```

## Driver Classes

The driver classes implement specific shape drawing logic:

### DriverRectangleSvg
```java
public class DriverRectangleSvg implements UDriver<URectangle, SvgGraphics> {
    public void draw(URectangle rect, double x, double y, ColorMapper mapper, UParam param, SvgGraphics svg) {
        final double rx = rect.getRx();
        final double ry = rect.getRy();
        double width = rect.getWidth();
        double height = rect.getHeight();
        
        applyFillColor(svg, mapper, param);
        applyStrokeColor(svg, mapper, param);
        
        svg.setStrokeWidth(param.getStroke().getThickness(), param.getStroke().getDasharraySvg());
        
        // Handle clipping
        final UClip clip = clipContainer.getClip();
        if (clip != null) {
            final Rectangle2D.Double r = clip.getClippedRectangle(new Rectangle2D.Double(x, y, width, height));
            x = r.x; y = r.y; width = r.width; height = r.height;
            if (height <= 0) return;
        }
        
        svg.svgRectangle(x, y, width, height, rx / 2, ry / 2, rect.getDeltaShadow(), 
                        rect.getComment(), rect.getCodeLine());
    }
}
```

## Configuration Classes

### SvgOption
```java
public class SvgOption {
    private HColor backcolor = HColors.WHITE;
    private ColorMapper colorMapper = ColorMapper.IDENTITY;
    private String preserveAspectRatio = "none";
    private XDimension2D minDim = new XDimension2D(0, 0);
    private boolean interactive = false;
    private String hover;
    private String linkTarget;
    private double scale = 1.0;
    private LengthAdjust lengthAdjust = LengthAdjust.SPACING;
    private boolean svgDimensionStyle = true;
    
    public static SvgOption basic() {
        return new SvgOption();
    }
    
    public SvgOption withBackcolor(HColor backcolor) {
        final SvgOption result = new SvgOption();
        result.backcolor = backcolor;
        return result;
    }
}
```

## Integration with Main System

### ImageBuilder Integration
```java
// From ImageBuilder.java
private UGraphic createUGraphicSVG(double scaleFactor, XDimension2D dim, Pragma pragma) {
    SvgOption option = SvgOption.basic()
        .withBackcolor(backcolor)
        .withColorMapper(colorMapper)
        .withScale(scaleFactor);
        
    if (diagram != null && pragma.getValue("svginteractive").equals("true")) {
        String interactiveBaseFilename = "default";
        if (diagram.getUmlDiagramType() == UmlDiagramType.SEQUENCE) {
            interactiveBaseFilename = "sequencediagram";
        }
        option = option.withInteractive(interactiveBaseFilename);
    }
    
    if (skinParam != null) {
        option = option.withLengthAdjust(skinParam.getlengthAdjust());
        option = option.withSvgDimensionStyle(skinParam.svgDimensionStyle());
    }
    
    final UGraphicSvg ug = UGraphicSvg.build(option, false, seed, stringBounder);
    return ug;
}
```

## Summary

The PlantUML SVG generation system is a comprehensive framework that:

1. **Creates structured SVG documents** through DOM manipulation
2. **Supports all basic drawing primitives** (rectangles, lines, paths, text, images)
3. **Handles advanced features** like gradients, shadows, and interactive elements
4. **Provides extensible driver architecture** for different shape types
5. **Integrates seamlessly** with the main PlantUML rendering pipeline

The architecture separates concerns between the low-level SVG generation (`SvgGraphics`) and the high-level graphics abstraction (`UGraphicSvg`), allowing for maintainable and extensible SVG output generation.