import { GET as getClusters, POST as postClusters } from '../../../app/api/neuro/clusters/route';
import { GET as getNodes, POST as postNodes } from '../../../app/api/neuro/nodes/route';
import { GET as getGpus, POST as postGpus } from '../../../app/api/neuro/gpus/route';
import { GET as getJobs, POST as postJobs } from '../../../app/api/neuro/jobs/route';
import { GET as getScheduler, POST as postScheduler } from '../../../app/api/neuro/scheduler/route';
import { NeuroDbStore } from '../../db/neuro-store';

describe('NEURO-CLUSTER REST API Endpoints — Cluster, Node, GPU & Job (NEURO-016)', () => {
  beforeEach(() => {
    NeuroDbStore.getInstance().clearMemoryStore();
  });

  it('should manage clusters via /api/neuro/clusters', async () => {
    const postReq = new Request('http://localhost/api/neuro/clusters', {
      method: 'POST',
      body: JSON.stringify({
        clusterId: 'CLUSTER-TITAN-01',
        name: 'Titan Supercluster',
        clusterType: 'hybrid',
        schedulerType: 'slurm',
        institutionId: 'inst_01',
      }),
    });

    const postRes = await postClusters(postReq as any);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.cluster.clusterId).toBe('CLUSTER-TITAN-01');

    const getReq = new Request('http://localhost/api/neuro/clusters?tenantId=inst_01');
    const getRes = await getClusters(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.clusters).toHaveLength(1);
  });

  it('should manage compute nodes and GPUs via /api/neuro/nodes and /api/neuro/gpus', async () => {
    const cluster = await NeuroDbStore.getInstance().createCluster({
      clusterId: 'c1',
      name: 'Cluster 1',
      institutionId: 'inst_01',
    });

    const postNodeReq = new Request('http://localhost/api/neuro/nodes', {
      method: 'POST',
      body: JSON.stringify({
        nodeId: 'node_dgx_01',
        clusterId: cluster.id,
        hostname: 'dgx-01.campus.internal',
        ipAddress: '10.0.0.10',
        gpuCount: 8,
        institutionId: 'inst_01',
      }),
    });

    const nodeRes = await postNodes(postNodeReq as any);
    expect(nodeRes.status).toBe(201);
    const nodeData = await nodeRes.json();

    const postGpuReq = new Request('http://localhost/api/neuro/gpus', {
      method: 'POST',
      body: JSON.stringify({
        gpuId: 'gpu_dgx01_0',
        nodeId: nodeData.node.id,
        gpuIndex: 0,
        model: 'NVIDIA-H100-SXM5-80GB',
        institutionId: 'inst_01',
      }),
    });

    const gpuRes = await postGpus(postGpuReq as any);
    expect(gpuRes.status).toBe(201);

    const getGpusReq = new Request(`http://localhost/api/neuro/gpus?nodeId=${nodeData.node.id}&tenantId=inst_01`);
    const getGpusRes = await getGpus(getGpusReq as any);
    expect(getGpusRes.status).toBe(200);
    const gpusData = await getGpusRes.json();
    expect(gpusData.gpus).toHaveLength(1);
  });

  it('should submit jobs and trigger scheduler evaluation cycle', async () => {
    const cluster = await NeuroDbStore.getInstance().createCluster({
      clusterId: 'c2',
      name: 'Cluster 2',
      institutionId: 'inst_01',
    });

    const postJobReq = new Request('http://localhost/api/neuro/jobs', {
      method: 'POST',
      body: JSON.stringify({
        jobName: 'Llama-3-FineTune',
        departmentId: 'dept_cs',
        clusterId: cluster.id,
        requestedGpus: 4,
        gpuModelRequirement: 'ANY',
        institutionId: 'inst_01',
      }),
    });

    const jobRes = await postJobs(postJobReq as any);
    expect(jobRes.status).toBe(201);
    const jobData = await jobRes.json();
    expect(jobData.job.jobName).toBe('Llama-3-FineTune');
    expect(jobData.schedulingCycle).toBeDefined();

    const getJobsReq = new Request('http://localhost/api/neuro/jobs?tenantId=inst_01');
    const getJobsRes = await getJobs(getJobsReq as any);
    expect(getJobsRes.status).toBe(200);
    const listData = await getJobsRes.json();
    expect(listData.jobs).toHaveLength(1);
  });
});
