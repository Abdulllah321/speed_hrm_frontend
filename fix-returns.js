const fs = require('fs');
const file = 'd:/projects/speed-limit/frontend/app/pos/inventory/returns/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings for easier searching
content = content.replace(/\r\n/g, '\n');

const missingHtml = `
                <div class="totals-bar">
                    <div>Total Lines: \${request.items.length}</div>
                    <div>
                        <span style="margin-right: 8px;">Total Quantity:</span>
                        <span class="double-underline">\${totalQty}</span>
                    </div>
                </div>`;

const searchCardStart = content.indexOf('                            {/* Item Search Card */}');
const endOfJsxMarker = content.indexOf('                ${notes ? `<div class="remarks-box">');

if (searchCardStart === -1 || endOfJsxMarker === -1) {
    console.error("Couldn't find markers");
    process.exit(1);
}

// Extract the JSX block they accidentally put in handlePrint
// It ends just before the string template continues.
let jsxStr = content.substring(searchCardStart, endOfJsxMarker);

// Clean up trailing divs from jsxStr (the user had a few closing divs)
// Wait, the jsxStr ends with:
//                         </div>
//                     </div>
//                 </div>
// Let's just remove the last two closing divs since we are wrapping it in grid.
jsxStr = jsxStr.trimEnd();
if (jsxStr.endsWith('</div>')) jsxStr = jsxStr.substring(0, jsxStr.lastIndexOf('</div>')).trimEnd();
if (jsxStr.endsWith('</div>')) jsxStr = jsxStr.substring(0, jsxStr.lastIndexOf('</div>')).trimEnd();
if (jsxStr.endsWith('</div>')) jsxStr = jsxStr.substring(0, jsxStr.lastIndexOf('</div>')).trimEnd();

const tableEndMarker = '                    </tbody>\n                </table>';
const tableEndIdx = content.indexOf(tableEndMarker);
const badHandlePrintPortion = content.substring(tableEndIdx + tableEndMarker.length, endOfJsxMarker);

// Fix handlePrint by replacing the bad portion with the missing HTML
content = content.replace(badHandlePrintPortion, '\n' + missingHtml + '\n\n');

// Prepare the proper isCreating block
const isCreatingWrapperStart = `                    {isCreating ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold tracking-tight">Create Return Request</h2>
                                <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                            
                            <Card className="border-border/50 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-md font-bold">Destination Warehouse</CardTitle>
                                    <CardDescription className="text-xs">Select the warehouse where the items will be returned.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                        <SelectTrigger className="w-full md:w-[300px]">
                                            <SelectValue placeholder="Select Warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map(w => (
                                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
${jsxStr}
                            </div>
                        </div>
                    ) : (
                        <>\n`;

const tabsMarker = '                    {/* Tabs */}';
content = content.replace(tabsMarker, isCreatingWrapperStart + tabsMarker);

const mainEndMarker = '                </div>\n            </main>';
const mainEnd = content.lastIndexOf(mainEndMarker);
if (mainEnd !== -1) {
    content = content.substring(0, mainEnd) + '                        </>\n                    )}\n' + content.substring(mainEnd);
}

fs.writeFileSync(file, content);
console.log("Fixed page.tsx");
