import AppKit
import CoreText
let fm=FileManager.default
for font in ["InstrumentSerif-Regular.ttf","InstrumentSerif-Italic.ttf","DepartureMono-Regular.woff2"] {
  CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: (font.hasSuffix(".ttf") ? "assets/source-fonts/" : "public/") + font) as CFURL, .process, nil)
}
let canvas=NSImage(size:NSSize(width:1200,height:630));canvas.lockFocus()
func color(_ n:UInt32)->NSColor{NSColor(srgbRed:Double((n>>16)&255)/255,green:Double((n>>8)&255)/255,blue:Double(n&255)/255,alpha:1)}
let full=NSRect(x:0,y:0,width:1200,height:630)
color(0x12100e).setFill(); full.fill()
NSGradient(starting:color(0x12100e),ending:color(0x3a1420))?.draw(in:full,angle:32)
let mark=NSImage(contentsOfFile:"public/taskmarket-mark.png")
mark?.draw(in:NSRect(x:82,y:492,width:56,height:56))
func draw(_ s:String,_ font:NSFont,_ c:NSColor,_ x:CGFloat,_ y:CGFloat)->CGFloat{
  let a=NSAttributedString(string:s,attributes:[.font:font,.foregroundColor:c]);a.draw(at:NSPoint(x:x,y:y));return a.size().width
}
let mono=NSFont(name:"DepartureMono-Regular",size:24) ?? .monospacedSystemFont(ofSize:24,weight:.medium)
let serif=NSFont(name:"InstrumentSerif-Regular",size:146) ?? .systemFont(ofSize:126,weight:.medium)
let italic=NSFont(name:"InstrumentSerif-Italic",size:146) ?? serif
_ = draw("TASKMARKET PULSE",mono,color(0xefe9e2),159,506)
let signal=CommandLine.arguments.contains("--signal")
let outcomes=CommandLine.arguments.contains("--outcomes")
let focused=signal || outcomes
let titleFont=focused ? (NSFont(name:"InstrumentSerif-Regular",size:109) ?? serif) : serif
let accentFont=focused ? (NSFont(name:"InstrumentSerif-Italic",size:109) ?? italic) : italic
let w=draw(signal ? "Where attention " : outcomes ? "After the " : "Follow the ",titleFont,color(0xefe9e2),80,271)
_ = draw(signal ? "goes." : outcomes ? "deadline." : "work.",accentFont,color(0xe74079),80+w,271)
_ = draw(signal ? "Open bounties, submissions and reward pools" : outcomes ? "Which bounties found a winner?" : "Market activity across Base and Tempo",mono,color(0xb0a79d),85,218)
_ = draw("taskmarket.dev",mono,color(0xd9a097),85,61)
canvas.unlockFocus()
let bitmap=NSBitmapImageRep(data:canvas.tiffRepresentation!)!
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:signal ? "public/signal-share.png" : outcomes ? "public/outcomes-share.png" : "public/share.png"))
