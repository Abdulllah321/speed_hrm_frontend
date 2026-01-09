export default function SimpleDepartmentListPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600">✅ Simple Department List Page</h1>
      <p className="mt-4">This is a simplified version without API calls.</p>
      <p className="mt-2"><strong>Current URL:</strong> master.localtest.me:3001/department/list</p>
      <p className="mt-2"><strong>Internal path:</strong> /master/department/list</p>
      
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
        <h2 className="font-semibold text-green-800">Test Results:</h2>
        <p className="text-green-700">✅ Routing is working correctly</p>
        <p className="text-green-700">✅ Page is loading without errors</p>
        <p className="text-green-700">✅ Master subdomain is functioning</p>
      </div>
      
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Mock Department List:</h3>
        <div className="space-y-2">
          <div className="p-3 bg-white border rounded shadow-sm">
            <h4 className="font-medium">IT Department</h4>
            <p className="text-sm text-gray-600">Information Technology</p>
          </div>
          <div className="p-3 bg-white border rounded shadow-sm">
            <h4 className="font-medium">HR Department</h4>
            <p className="text-sm text-gray-600">Human Resources</p>
          </div>
          <div className="p-3 bg-white border rounded shadow-sm">
            <h4 className="font-medium">Finance Department</h4>
            <p className="text-sm text-gray-600">Financial Management</p>
          </div>
        </div>
      </div>
    </div>
  );
}