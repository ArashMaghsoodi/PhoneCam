namespace PhoneCam;

/// <summary>Turns an Annex B H.264 file into packets shaped like the phone stream, for the decoder self-test.</summary>
static class DemoStream
{
    public static List<VideoPacket> ReadAnnexB(string path)
    {
        var data = File.ReadAllBytes(path);
        var packets = new List<VideoPacket>();
        var prefix = new List<byte>();
        bool prefixHasConfig = false;
        long pts = 0;

        foreach (var (start, end) in SplitNalUnits(data))
        {
            int payload = start + (data[start + 2] == 1 ? 3 : 4);
            int type = data[payload] & 0x1F;
            if (type is 1 or 5)
            {
                var frame = new byte[prefix.Count + end - start];
                prefix.CopyTo(frame);
                Array.Copy(data, start, frame, prefix.Count, end - start);
                packets.Add(new VideoPacket(frame, pts, type == 5, prefixHasConfig));
                pts += 33_333;
                prefix.Clear();
                prefixHasConfig = false;
            }
            else
            {
                prefixHasConfig |= type is 7 or 8;
                prefix.AddRange(data.AsSpan(start, end - start).ToArray());
            }
        }
        return packets;
    }

    static IEnumerable<(int Start, int End)> SplitNalUnits(byte[] data)
    {
        var starts = new List<int>();
        for (int i = 0; i + 3 < data.Length; i++)
        {
            if (data[i] == 0 && data[i + 1] == 0 && data[i + 2] == 1)
            {
                starts.Add(i > 0 && data[i - 1] == 0 ? i - 1 : i);
                i += 2;
            }
        }
        for (int n = 0; n < starts.Count; n++)
            yield return (starts[n], n + 1 < starts.Count ? starts[n + 1] : data.Length);
    }
}
