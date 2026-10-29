param(
  [string]$PortraitPath = (Join-Path $PSScriptRoot '..\art_sources\characters\math_master_original.png'),
  [string]$BodyPath = (Join-Path $PSScriptRoot '..\art_sources\characters\math_master_body_generated.png'),
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\public\assets\characters\math_master.png')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$builderSource = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class MathMasterAssetBuilder
{
    private static Bitmap ExtractOriginalHead(Bitmap source)
    {
        int width = source.Width;
        int height = Math.Min(181, source.Height);
        int pixelCount = width * height;
        var candidate = new bool[pixelCount];

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                Color pixel = source.GetPixel(x, y);
                int channelMax = Math.Max(pixel.R, Math.Max(pixel.G, pixel.B));
                int channelMin = Math.Min(pixel.R, Math.Min(pixel.G, pixel.B));
                bool nearlyWhite = channelMin >= 170 && channelMax - channelMin <= 24;
                bool blueFrame = pixel.B - pixel.R >= 24 && pixel.B - pixel.G >= 10;
                candidate[y * width + x] = !nearlyWhite && !blueFrame;
            }
        }

        int seed = 100 * width + 81;
        if (seed < 0 || seed >= candidate.Length || !candidate[seed])
            throw new InvalidOperationException("Portrait segmentation seed is outside the subject.");

        var subject = new bool[pixelCount];
        var queue = new Queue<int>();
        subject[seed] = true;
        queue.Enqueue(seed);
        while (queue.Count > 0)
        {
            int index = queue.Dequeue();
            int x = index % width;
            int y = index / width;
            Visit(candidate, subject, queue, x > 0 ? index - 1 : -1);
            Visit(candidate, subject, queue, x + 1 < width ? index + 1 : -1);
            Visit(candidate, subject, queue, y > 0 ? index - width : -1);
            Visit(candidate, subject, queue, y + 1 < height ? index + width : -1);
        }

        var exterior = new bool[pixelCount];
        for (int x = 0; x < width; x++)
        {
            EnqueueExterior(subject, exterior, queue, x);
            EnqueueExterior(subject, exterior, queue, (height - 1) * width + x);
        }
        for (int y = 0; y < height; y++)
        {
            EnqueueExterior(subject, exterior, queue, y * width);
            EnqueueExterior(subject, exterior, queue, y * width + width - 1);
        }
        while (queue.Count > 0)
        {
            int index = queue.Dequeue();
            int x = index % width;
            int y = index / width;
            VisitExterior(subject, exterior, queue, x > 0 ? index - 1 : -1);
            VisitExterior(subject, exterior, queue, x + 1 < width ? index + 1 : -1);
            VisitExterior(subject, exterior, queue, y > 0 ? index - width : -1);
            VisitExterior(subject, exterior, queue, y + 1 < height ? index + width : -1);
        }

        var keep = new bool[pixelCount];
        for (int index = 0; index < pixelCount; index++)
            keep[index] = subject[index] || !exterior[index];

        var eroded = new bool[pixelCount];
        for (int y = 1; y + 1 < height; y++)
        {
            for (int x = 1; x + 1 < width; x++)
            {
                int index = y * width + x;
                eroded[index] = keep[index] && keep[index - 1] && keep[index + 1]
                    && keep[index - width] && keep[index + width];
            }
        }

        var result = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int index = y * width + x;
                if (!eroded[index]) continue;
                Color pixel = source.GetPixel(x, y);
                result.SetPixel(x, y, Color.FromArgb(255, pixel.R, pixel.G, pixel.B));
            }
        }
        return result;
    }

    private static void Visit(bool[] candidate, bool[] visited, Queue<int> queue, int index)
    {
        if (index < 0 || !candidate[index] || visited[index]) return;
        visited[index] = true;
        queue.Enqueue(index);
    }

    private static void EnqueueExterior(bool[] subject, bool[] exterior, Queue<int> queue, int index)
    {
        if (subject[index] || exterior[index]) return;
        exterior[index] = true;
        queue.Enqueue(index);
    }

    private static void VisitExterior(bool[] subject, bool[] exterior, Queue<int> queue, int index)
    {
        if (index < 0 || subject[index] || exterior[index]) return;
        exterior[index] = true;
        queue.Enqueue(index);
    }

    public static void Build(string portraitPath, string bodyPath, string outputPath)
    {
        using (var portrait = new Bitmap(portraitPath))
        using (var body = new Bitmap(bodyPath))
        using (var head = ExtractOriginalHead(portrait))
        using (var composite = new Bitmap(body.Width, body.Height, PixelFormat.Format32bppArgb))
        {
            using (Graphics graphics = Graphics.FromImage(composite))
            {
                graphics.Clear(Color.Transparent);
                graphics.DrawImageUnscaled(body, 0, 0);

                graphics.CompositingMode = CompositingMode.SourceCopy;
                using (var transparentBrush = new SolidBrush(Color.Transparent))
                {
                    graphics.FillEllipse(transparentBrush, 334, 66, 356, 500);
                    graphics.FillRectangle(transparentBrush, 392, 410, 240, 170);
                }

                graphics.CompositingMode = CompositingMode.SourceOver;
                SetQuality(graphics);
                graphics.DrawImage(head, new Rectangle(304, 85, 416, 462));
            }

            using (var output = new Bitmap(256, 256, PixelFormat.Format32bppArgb))
            {
                output.SetResolution(96, 96);
                using (Graphics graphics = Graphics.FromImage(output))
                {
                    graphics.Clear(Color.Transparent);
                    SetQuality(graphics);
                    double scale = Math.Min(248.0 / composite.Width, 250.0 / composite.Height);
                    int width = (int)Math.Round(composite.Width * scale);
                    int height = (int)Math.Round(composite.Height * scale);
                    int left = (256 - width) / 2;
                    int top = (256 - height) / 2;
                    graphics.DrawImage(composite, new Rectangle(left, top, width, height));
                }

                string temporaryPath = outputPath + ".tmp.png";
                output.Save(temporaryPath, ImageFormat.Png);
                File.Copy(temporaryPath, outputPath, true);
                File.Delete(temporaryPath);
            }
        }
    }

    private static void SetQuality(Graphics graphics)
    {
        graphics.CompositingQuality = CompositingQuality.HighQuality;
        graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
        graphics.SmoothingMode = SmoothingMode.HighQuality;
        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
    }
}
'@

Add-Type -TypeDefinition $builderSource -ReferencedAssemblies System.Drawing
[MathMasterAssetBuilder]::Build(
  (Resolve-Path -LiteralPath $PortraitPath),
  (Resolve-Path -LiteralPath $BodyPath),
  $OutputPath
)

Write-Output "Updated $OutputPath"
