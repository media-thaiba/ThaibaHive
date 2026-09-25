// Mobile Data Models for SUPPLY-HIVE / ProcurementOS (SUPPLY-020)

class MobilePurchaseOrderItem {
  final String id;
  final String poNumber;
  final String vendorName;
  final String departmentId;
  final double totalAmountUsd;
  final String status;
  final String shippingDock;
  final int totalLineItems;

  const MobilePurchaseOrderItem({
    required this.id,
    required this.poNumber,
    required this.vendorName,
    required this.departmentId,
    required this.totalAmountUsd,
    required this.status,
    required this.shippingDock,
    required this.totalLineItems,
  });

  factory MobilePurchaseOrderItem.fromJson(Map<String, dynamic> json) {
    return MobilePurchaseOrderItem(
      id: json['id'] ?? '',
      poNumber: json['poNumber'] ?? '',
      vendorName: json['vendorName'] ?? 'Unknown Vendor',
      departmentId: json['departmentId'] ?? '',
      totalAmountUsd: (json['totalAmountUsd'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'issued',
      shippingDock: json['shippingDock'] ?? 'DOCK_A_CENTRAL',
      totalLineItems: (json['totalLineItems'] as num?)?.toInt() ?? 1,
    );
  }
}

class MobileDockReceiptScan {
  final String receiptId;
  final String poId;
  final String barcodeScanned;
  final String itemSku;
  final int quantityReceived;
  final String packageCondition; // 'good', 'damaged', 'tampered'
  final String timestamp;
  final bool isSynced;

  const MobileDockReceiptScan({
    required this.receiptId,
    required this.poId,
    required this.barcodeScanned,
    required this.itemSku,
    required this.quantityReceived,
    required this.packageCondition,
    required this.timestamp,
    this.isSynced = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'receiptId': receiptId,
      'poId': poId,
      'barcodeScanned': barcodeScanned,
      'itemSku': itemSku,
      'quantityReceived': quantityReceived,
      'packageCondition': packageCondition,
      'timestamp': timestamp,
      'isSynced': isSynced,
    };
  }

  factory MobileDockReceiptScan.fromJson(Map<String, dynamic> json) {
    return MobileDockReceiptScan(
      receiptId: json['receiptId'] ?? '',
      poId: json['poId'] ?? '',
      barcodeScanned: json['barcodeScanned'] ?? '',
      itemSku: json['itemSku'] ?? '',
      quantityReceived: (json['quantityReceived'] as num?)?.toInt() ?? 1,
      packageCondition: json['packageCondition'] ?? 'good',
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
      isSynced: json['isSynced'] ?? true,
    );
  }
}

class MobileOfflineSyncQueueItem {
  final String queueId;
  final String action;
  final Map<String, dynamic> payload;
  final int retryCount;
  final String? lastError;
  final String createdAt;

  const MobileOfflineSyncQueueItem({
    required this.queueId,
    required this.action,
    required this.payload,
    this.retryCount = 0,
    this.lastError,
    required this.createdAt,
  });
}
