'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';

interface JobSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => Promise<void>;
  clusterId: string;
}

export const JobSubmissionModal: React.FC<JobSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  clusterId,
}) => {
  const [jobName, setJobName] = useState('');
  const [departmentId, setDepartmentId] = useState('dept_cs');
  const [jobType, setJobType] = useState('distributed_training');
  const [priority, setPriority] = useState('normal');
  const [requestedGpus, setRequestedGpus] = useState(4);
  const [gpuModelRequirement, setGpuModelRequirement] = useState('NVIDIA-H100');
  const [containerImage, setContainerImage] = useState('pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime');
  const [entrypointCommand, setEntrypointCommand] = useState('python train.py');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        jobName,
        departmentId,
        clusterId,
        jobType,
        priority,
        requestedGpus: Number(requestedGpus),
        gpuModelRequirement,
        containerImage,
        entrypointCommand,
      });
      onClose();
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit Autonomous Research Compute Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="jobName">Experiment / Job Name</Label>
            <Input
              id="jobName"
              placeholder="e.g. Llama-3.1-70B-Medical-FineTune"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <SelectItem value="dept_cs">Computer Science</SelectItem>
                <SelectItem value="dept_biomed">Biomedical Informatics</SelectItem>
                <SelectItem value="dept_physics">Computational Physics</SelectItem>
                <SelectItem value="dept_robotics">Robotics Institute</SelectItem>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <SelectItem value="urgent">Urgent (Preemptive)</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="preemptible">Preemptible (Lowest Cost)</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="requestedGpus">Requested GPUs</Label>
              <Input
                id="requestedGpus"
                type="number"
                min={1}
                max={64}
                value={requestedGpus}
                onChange={(e) => setRequestedGpus(parseInt(e.target.value, 10))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>GPU Model</Label>
              <Select value={gpuModelRequirement} onChange={(e) => setGpuModelRequirement(e.target.value)}>
                <SelectItem value="NVIDIA-H100">NVIDIA H100 (80GB)</SelectItem>
                <SelectItem value="NVIDIA-A100">NVIDIA A100 (80GB)</SelectItem>
                <SelectItem value="NVIDIA-L40S">NVIDIA L40S (48GB)</SelectItem>
                <SelectItem value="ANY">Any Available</SelectItem>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="containerImage">Container Image</Label>
            <Input
              id="containerImage"
              value={containerImage}
              onChange={(e) => setContainerImage(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entrypointCommand">Command</Label>
            <Input
              id="entrypointCommand"
              value={entrypointCommand}
              onChange={(e) => setEntrypointCommand(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting & Scheduling...' : 'Submit Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
