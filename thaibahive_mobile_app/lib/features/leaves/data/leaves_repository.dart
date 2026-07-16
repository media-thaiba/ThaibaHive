import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/leave_balance_model.dart';
import '../../../models/leave_request_model.dart';
import '../../../models/leave_type_model.dart';

final leavesRepositoryProvider = Provider<LeavesRepository>((ref) {
  return LeavesRepository(ref.watch(apiClientProvider));
});

class LeavesRepository {
  final ApiClient _api;

  LeavesRepository(this._api);

  List<dynamic> _parseList(dynamic json, List<String> possibleKeys) {
    if (json is List) {
      return json;
    }
    if (json is Map<String, dynamic>) {
      for (final key in possibleKeys) {
        if (json.containsKey(key) && json[key] is List) {
          return json[key] as List<dynamic>;
        }
      }
    }
    return [];
  }

  Future<List<LeaveRequestModel>> getLeaves({
    String? status,
    int page = 1,
  }) async {
    final params = <String, dynamic>{'page': page};
    if (status != null && status.isNotEmpty && status != 'all') {
      params['status'] = status;
    }
    final data = await _api.get(
      '/leaves',
      queryParameters: params,
      fromJson: (json) {
        final list = _parseList(json, ['data', 'leaves']);
        return list
            .map((e) => LeaveRequestModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<LeaveRequestModel> createLeave(Map<String, dynamic> data) async {
    return _api.post(
      '/leaves',
      data: data,
      fromJson: (json) => LeaveRequestModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<LeaveRequestModel> getLeaveById(String id) async {
    return _api.get(
      '/leaves/$id',
      fromJson: (json) => LeaveRequestModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<LeaveRequestModel> updateLeave(
    String id,
    Map<String, dynamic> data,
  ) async {
    return _api.put(
      '/leaves/$id',
      data: data,
      fromJson: (json) => LeaveRequestModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<LeaveBalanceModel>> getLeaveBalance() async {
    return _api.get(
      '/leaves/balance',
      fromJson: (json) {
        final list = _parseList(json, ['data', 'balances', 'leaveBalances']);
        return list
            .map((e) => LeaveBalanceModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  Future<List<LeaveTypeModel>> getLeaveTypes() async {
    return _api.get(
      '/leaves/types',
      fromJson: (json) {
        final list = _parseList(json, ['data', 'types', 'leaveTypes']);
        return list
            .map((e) => LeaveTypeModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }
}
