import sys, zipfile, json, base64, collections
src, dst = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(src)
text, binary, exts = [], [], collections.Counter()
for i in z.infolist():
    if i.is_dir():
        continue
    data = z.read(i)
    exts[i.filename.rsplit('.', 1)[-1] if '.' in i.filename else '(none)'] += 1
    try:
        text.append([i.filename, data.decode('utf-8')])
    except UnicodeDecodeError:
        binary.append([i.filename, base64.b64encode(data).decode('ascii')])
with open(dst, 'w', encoding='utf-8') as f:
    json.dump({'text': text, 'binary': binary}, f, ensure_ascii=False, separators=(',', ':'))
print('text files', len(text), 'binary files', len(binary), [b[0] for b in binary][:20])
print('extensions', exts.most_common(8))
print('uncompressed bytes', sum(i.file_size for i in z.infolist()))
